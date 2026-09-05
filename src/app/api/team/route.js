import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import TeamInvite from '@/lib/models/TeamInvite';

const allowedRoles = ['admin', 'hr', 'finance', 'viewer'];

function hashToken(token) {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: 'Not authenticated.',
        },
        { status: 401 }
      );
    }

    await connectDB();

    const currentUser = await User.findById(session.user.id)
      .select('-passwordHash')
      .lean();

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: 'User not found.',
        },
        { status: 404 }
      );
    }

    const members = await User.find({
      companyId: currentUser.companyId,
    })
      .select('-passwordHash')
      .sort({ createdAt: 1 })
      .lean();

    const invites = await TeamInvite.find({
      companyId: currentUser.companyId,
      acceptedAt: null,
      expiresAt: { $gt: new Date() },
    })
      .select('-tokenHash')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      currentUserId: currentUser._id.toString(),
      role: currentUser.role,
      members: members.map((member) => ({
        id: member._id.toString(),
        email: member.email,
        fullName: member.fullName,
        companyId: member.companyId.toString(),
        role: member.role,
        createdAt: member.createdAt,
      })),
      invites: invites.map((invite) => ({
        id: invite._id.toString(),
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt,
      })),
    });
  } catch (error) {
    console.error('GET /api/team error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Unable to load team members.',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: 'Not authenticated.',
        },
        { status: 401 }
      );
    }

    await connectDB();

    const currentUser = await User.findById(session.user.id).lean();

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: 'User not found.',
        },
        { status: 404 }
      );
    }

    if (currentUser.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          message: 'Only admins can change team roles.',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const memberId = body.memberId;
    const role = body.role;

    if (!memberId || !allowedRoles.includes(role)) {
      return NextResponse.json(
        {
          success: false,
          message: 'A valid member ID and role are required.',
        },
        { status: 400 }
      );
    }

    if (memberId === session.user.id) {
      return NextResponse.json(
        {
          success: false,
          message: 'You cannot change your own role.',
        },
        { status: 400 }
      );
    }

    const updatedMember = await User.findOneAndUpdate(
      {
        _id: memberId,
        companyId: currentUser.companyId,
      },
      {
        role,
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .select('-passwordHash')
      .lean();

    if (!updatedMember) {
      return NextResponse.json(
        {
          success: false,
          message: 'Team member not found.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Team member role updated successfully.',
      member: {
        id: updatedMember._id.toString(),
        email: updatedMember.email,
        fullName: updatedMember.fullName,
        role: updatedMember.role,
        createdAt: updatedMember.createdAt,
      },
    });
  } catch (error) {
    console.error('PATCH /api/team error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Unable to update team member role.',
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: 'Not authenticated.',
        },
        { status: 401 }
      );
    }

    await connectDB();

    const currentUser = await User.findById(session.user.id).lean();

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: 'User not found.',
        },
        { status: 404 }
      );
    }

    if (currentUser.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          message: 'Only admins can invite team members.',
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const email = String(body.email || '')
      .trim()
      .toLowerCase();

    const role = body.role;

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        {
          success: false,
          message: 'Please provide a valid email address.',
        },
        { status: 400 }
      );
    }

    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Please select a valid role.',
        },
        { status: 400 }
      );
    }

    const existingMember = await User.findOne({
      email,
      companyId: currentUser.companyId,
    }).lean();

    if (existingMember) {
      return NextResponse.json(
        {
          success: false,
          message: 'This email already belongs to a team member.',
        },
        { status: 409 }
      );
    }

    const existingInvite = await TeamInvite.findOne({
      email,
      companyId: currentUser.companyId,
      acceptedAt: null,
      expiresAt: { $gt: new Date() },
    }).lean();

    if (existingInvite) {
      return NextResponse.json(
        {
          success: false,
          message: 'An active invitation already exists for this email.',
        },
        { status: 409 }
      );
    }

    const rawToken = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    const tokenHash = hashToken(rawToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    const invite = await TeamInvite.create({
      companyId: currentUser.companyId,
      email,
      role,
      tokenHash,
      expiresAt,
    });

    const baseUrl =
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3000';

    const invitationLink =
      `${baseUrl}/invite/${rawToken}`;

    return NextResponse.json(
      {
        success: true,
        message: 'Invitation created successfully.',
        invite: {
          id: invite._id.toString(),
          email: invite.email,
          role: invite.role,
          expiresAt: invite.expiresAt,
          invitationLink,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/team error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Unable to create invitation.',
      },
      { status: 500 }
    );
  }
}