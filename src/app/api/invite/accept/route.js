import crypto from 'crypto';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import TeamInvite from '@/lib/models/TeamInvite';

function hashToken(token) {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
}

export async function POST(request) {
  try {
    const body = await request.json();

    const token = String(body.token || '').trim();
    const fullName = String(body.fullName || '').trim();
    const password = String(body.password || '');

    if (!token || !fullName || !password) {
      return NextResponse.json(
        {
          success: false,
          message: 'Token, full name, and password are required.',
        },
        { status: 400 }
      );
    }

    if (fullName.length < 2) {
      return NextResponse.json(
        {
          success: false,
          message: 'Please enter a valid full name.',
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          message: 'Password must contain at least 8 characters.',
        },
        { status: 400 }
      );
    }

    await connectDB();

    const tokenHash = hashToken(token);

    const invite = await TeamInvite.findOne({
      tokenHash,
      acceptedAt: null,
      expiresAt: { $gt: new Date() },
    }).lean();

    if (!invite) {
      return NextResponse.json(
        {
          success: false,
          message: 'This invitation is invalid, expired, or already accepted.',
        },
        { status: 400 }
      );
    }

    const existingUser = await User.findOne({
      email: invite.email,
    }).lean();

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: 'An account already exists for this email address.',
        },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const newUser = await User.create({
      email: invite.email,
      passwordHash,
      fullName,
      companyId: invite.companyId,
      role: invite.role,
    });

    await TeamInvite.findByIdAndUpdate(invite._id, {
      acceptedAt: new Date(),
      acceptedBy: newUser._id,
    });

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. You can now log in.',
    });
  } catch (error) {
    console.error('POST /api/invite/accept error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Unable to accept invitation.',
      },
      { status: 500 }
    );
  }
}