import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/auth';
import { connectDB } from '@/lib/mongodb';

import User from '@/lib/models/User';
import Company from '@/lib/models/Company';

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

    const user = await User.findById(session.user.id)
      .select('-passwordHash')
      .lean();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'User not found.',
        },
        { status: 404 }
      );
    }

    const company = await Company.findById(user.companyId).lean();

    if (!company) {
      return NextResponse.json(
        {
          success: false,
          message: 'Company not found.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,

      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.fullName,
      },

      profile: {
        id: user._id.toString(),
        full_name: user.fullName,
        email: user.email,
        company_id: user.companyId.toString(),
        role: user.role,
      },

      company: {
        ...company,
        _id: company._id.toString(),
      },

      companyId: user.companyId.toString(),
      role: user.role,
    });
  } catch (error) {
    console.error('Company API error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Unable to load company information.',
      },
      { status: 500 }
    );
  }
}