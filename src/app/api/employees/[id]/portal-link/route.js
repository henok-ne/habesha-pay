import { NextResponse } from 'next/server';
import crypto from 'crypto';

import { connectDB } from '@/lib/mongodb';
import Employee from '@/lib/models/Employee';
import Company from '@/lib/models/Company';
import PortalToken from '@/lib/models/PortalToken';

export async function POST(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Employee ID is required.' },
        { status: 400 }
      );
    }

    // Find the employee
    const employee = await Employee.findById(id);

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found.' },
        { status: 404 }
      );
    }

    // Make sure the employee belongs to a valid company
    const company = await Company.findById(employee.companyId);

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found.' },
        { status: 404 }
      );
    }

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex');

    // Portal link expires in 14 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    // Save token in MongoDB
    await PortalToken.create({
      token,
      employeeId: employee._id,
      companyId: company._id,
      expiresAt,
    });

    // Build the URL
    const baseUrl =
      process.env.NEXTAUTH_URL || 'http://localhost:3000';

    const portalUrl = `${baseUrl}/portal/${token}`;

    return NextResponse.json({
      success: true,
      portalUrl,
      expiresAt,
    });
  } catch (error) {
    console.error('Portal link generation error:', error);

    return NextResponse.json(
      { error: 'Failed to generate portal link.' },
      { status: 500 }
    );
  }
}