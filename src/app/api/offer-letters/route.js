import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/auth';
import { connectDB } from '@/lib/mongodb';

import Company from '@/lib/models/Company';
import OfferLetter from '@/lib/models/OfferLetter';


// =====================================================
// GET
// Load offer letters for the current company
// =====================================================
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const companyId = session.user.companyId;

    const letters = await OfferLetter.find({
      companyId,
    })
      .sort({ createdAt: -1 })
      .lean();

    const company = await Company.findById(companyId)
      .select('name')
      .lean();

    const formattedLetters = letters.map((letter) => ({
      id: letter._id.toString(),

      candidate_name: letter.candidateName,
      position: letter.position,

      // The current frontend expects basic_salary
      basic_salary: letter.salary || 0,

      start_date: letter.startDate
        ? new Date(letter.startDate)
            .toISOString()
            .split('T')[0]
        : '',

      // The current frontend expects letter_body
      letter_body: letter.content || '',

      status: letter.status,

      sent_at: letter.sentAt || null,
      accepted_at: letter.acceptedAt || null,

      created_at: letter.createdAt,
    }));

    return NextResponse.json({
      letters: formattedLetters,
      company: {
        name: company?.name || '',
      },
    });
  } catch (error) {
    console.error('GET /api/offer-letters error:', error);

    return NextResponse.json(
      { error: 'Failed to load offer letters' },
      { status: 500 }
    );
  }
}


// =====================================================
// POST
// Create a new offer letter
// =====================================================
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const companyId = session.user.companyId;

    const body = await request.json();

    const {
      candidate_name,
      position,
      start_date,
      basic_salary,
      letter_body,
    } = body;

    // -----------------------------
    // Validation
    // -----------------------------
    if (
      typeof candidate_name !== 'string' ||
      !candidate_name.trim()
    ) {
      return NextResponse.json(
        { error: 'Candidate name is required' },
        { status: 400 }
      );
    }

    if (
      typeof position !== 'string' ||
      !position.trim()
    ) {
      return NextResponse.json(
        { error: 'Position is required' },
        { status: 400 }
      );
    }

    const salary = Number(basic_salary || 0);

    if (!Number.isFinite(salary) || salary < 0) {
      return NextResponse.json(
        { error: 'Salary must be a valid positive number' },
        { status: 400 }
      );
    }

    // -----------------------------
    // Verify company exists
    // -----------------------------
    const company = await Company.findById(companyId)
      .select('_id')
      .lean();

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // -----------------------------
    // Create offer letter
    // -----------------------------
    const letter = await OfferLetter.create({
      companyId,

      candidateName: candidate_name.trim(),

      position: position.trim(),

      salary,

      startDate: start_date
        ? new Date(start_date)
        : undefined,

      content:
        typeof letter_body === 'string'
          ? letter_body
          : '',

      status: 'draft',
    });

    return NextResponse.json(
      {
        message: 'Offer letter created successfully',

        letter: {
          id: letter._id.toString(),
          candidate_name: letter.candidateName,
          position: letter.position,
          basic_salary: letter.salary || 0,
          letter_body: letter.content || '',
          status: letter.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/offer-letters error:', error);

    return NextResponse.json(
      { error: 'Failed to create offer letter' },
      { status: 500 }
    );
  }
}


// =====================================================
// PATCH
// Update offer letter status
// =====================================================
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const companyId = session.user.companyId;

    const body = await request.json();

    const { id, status } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Offer letter ID is required' },
        { status: 400 }
      );
    }

    if (
      !['draft', 'sent', 'accepted', 'rejected'].includes(
        status
      )
    ) {
      return NextResponse.json(
        { error: 'Invalid offer letter status' },
        { status: 400 }
      );
    }

    const letter = await OfferLetter.findOne({
      _id: id,
      companyId,
    });

    if (!letter) {
      return NextResponse.json(
        { error: 'Offer letter not found' },
        { status: 404 }
      );
    }

    letter.status = status;

    if (status === 'sent') {
      letter.sentAt = new Date();
    }

    if (status === 'accepted') {
      letter.acceptedAt = new Date();
    }

    await letter.save();

    return NextResponse.json({
      message: `Offer letter marked as ${status}`,

      letter: {
        id: letter._id.toString(),
        status: letter.status,
        sent_at: letter.sentAt || null,
        accepted_at: letter.acceptedAt || null,
      },
    });
  } catch (error) {
    console.error('PATCH /api/offer-letters error:', error);

    return NextResponse.json(
      { error: 'Failed to update offer letter' },
      { status: 500 }
    );
  }
}