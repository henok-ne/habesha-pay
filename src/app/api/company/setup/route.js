import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';

import { authOptions } from '@/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Company from '@/lib/models/Company';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: 'You must be logged in.',
        },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();

    const companyName = body.companyName?.trim();
    const fullName = body.fullName?.trim();

    if (!companyName) {
      return NextResponse.json(
        {
          success: false,
          message: 'Enter a company name.',
        },
        { status: 400 }
      );
    }

    if (!fullName) {
      return NextResponse.json(
        {
          success: false,
          message: 'Enter your full name.',
        },
        { status: 400 }
      );
    }

    const user = await User.findById(session.user.id);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'User account not found.',
        },
        { status: 404 }
      );
    }

    // If the user already belongs to a company, do not create another one.
    if (user.companyId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Your account is already connected to a company.',
        },
        { status: 400 }
      );
    }

    const company = await Company.create({
      name: companyName,
      city: 'Addis Ababa',
      pensionScheme: 'private',
    });

    user.companyId = company._id;
    user.fullName = fullName;
    user.role = 'admin';

    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Company workspace created successfully.',
      company: {
        _id: company._id.toString(),
        name: company.name,
        city: company.city,
        pensionScheme: company.pensionScheme,
      },
    });
  } catch (error) {
    console.error('Company setup error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Unable to finish company setup.',
      },
      { status: 500 }
    );
  }
}