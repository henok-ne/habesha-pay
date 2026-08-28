import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Company from '@/lib/models/Company';

export async function POST(request) {
  try {
    const body = await request.json();

    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const fullName = String(body.fullName || '').trim();
    const companyName = String(body.companyName || '').trim();

    if (!email || !password || !fullName || !companyName) {
      return NextResponse.json(
        {
          success: false,
          message: 'Email, password, full name, and company name are required.',
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          message: 'Password must be at least 8 characters.',
        },
        { status: 400 }
      );
    }

    await connectDB();

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: 'An account with this email already exists.',
        },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const company = await Company.create({
      name: companyName,
    });

    try {
      const user = await User.create({
        email,
        passwordHash,
        fullName,
        companyId: company._id,
        role: 'admin',
      });

      return NextResponse.json(
        {
          success: true,
          message: 'Account created successfully.',
          user: {
            id: user._id.toString(),
            email: user.email,
            fullName: user.fullName,
            companyId: company._id.toString(),
            role: user.role,
          },
        },
        { status: 201 }
      );
    } catch (userError) {
      // If user creation fails after the company was created,
      // remove the company so we don't leave orphaned data.
      await Company.findByIdAndDelete(company._id);
      throw userError;
    }
  } catch (error) {
    console.error('Registration error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Unable to create account.',
      },
      { status: 500 }
    );
  }
}