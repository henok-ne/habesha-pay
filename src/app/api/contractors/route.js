import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/auth';
import { connectDB } from '@/lib/mongodb';

import Contractor from '@/lib/models/Contractor';

const VALID_RATE_TYPES = ['fixed', 'hourly', 'per_project'];
const VALID_STATUSES = ['active', 'inactive', 'terminated'];

function formatContractor(contractor) {
  return {
    id: contractor._id.toString(),
    full_name: contractor.fullName,
    company_name: contractor.companyName || '',
    email: contractor.email || '',
    phone: contractor.phone || '',
    tin: contractor.tin || '',
    service_description: contractor.serviceDescription || '',
    rate: contractor.monthlyAmount || 0,
    rate_type: contractor.rateType || 'fixed',
    withholding_tax_rate: contractor.withholdingTaxRate ?? 2,
    status: contractor.status,
    created_at: contractor.createdAt,
  };
}

async function getAuthenticatedSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId) {
    return null;
  }

  return session;
}

export async function GET() {
  try {
    const session = await getAuthenticatedSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const contractors = await Contractor.find({
      companyId: session.user.companyId,
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      contractors: contractors.map(formatContractor),
    });
  } catch (error) {
    console.error('GET /api/contractors error:', error);

    return NextResponse.json(
      { error: 'Failed to load contractors' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getAuthenticatedSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();

    const {
      full_name,
      company_name,
      email,
      phone,
      tin,
      service_description,
      rate,
      rate_type,
      withholding_tax_rate,
    } = body;

    if (
      typeof full_name !== 'string' ||
      !full_name.trim()
    ) {
      return NextResponse.json(
        { error: 'Full name is required' },
        { status: 400 }
      );
    }

    const monthlyAmount = Number(rate || 0);

    if (
      !Number.isFinite(monthlyAmount) ||
      monthlyAmount < 0
    ) {
      return NextResponse.json(
        { error: 'Rate must be a valid non-negative number' },
        { status: 400 }
      );
    }

    const selectedRateType = rate_type || 'fixed';

    if (!VALID_RATE_TYPES.includes(selectedRateType)) {
      return NextResponse.json(
        { error: 'Invalid rate type' },
        { status: 400 }
      );
    }

    const withholdingTaxRate = Number(
      withholding_tax_rate ?? 2
    );

    if (
      !Number.isFinite(withholdingTaxRate) ||
      withholdingTaxRate < 0 ||
      withholdingTaxRate > 100
    ) {
      return NextResponse.json(
        { error: 'Withholding tax rate must be between 0 and 100' },
        { status: 400 }
      );
    }

    const contractor = await Contractor.create({
      companyId: session.user.companyId,

      fullName: full_name.trim(),

      companyName:
        typeof company_name === 'string' &&
        company_name.trim()
          ? company_name.trim()
          : undefined,

      email:
        typeof email === 'string' && email.trim()
          ? email.trim().toLowerCase()
          : undefined,

      phone:
        typeof phone === 'string' && phone.trim()
          ? phone.trim()
          : undefined,

      tin:
        typeof tin === 'string' && tin.trim()
          ? tin.trim()
          : undefined,

      serviceDescription:
        typeof service_description === 'string' &&
        service_description.trim()
          ? service_description.trim()
          : undefined,

      monthlyAmount,

      rateType: selectedRateType,

      withholdingTaxRate,

      status: 'active',
    });

    return NextResponse.json(
      {
        message: 'Contractor created successfully',
        contractor: formatContractor(contractor),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/contractors error:', error);

    return NextResponse.json(
      { error: 'Failed to create contractor' },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const session = await getAuthenticatedSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();

    const { id, status } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Contractor ID is required' },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid contractor status' },
        { status: 400 }
      );
    }

    const contractor = await Contractor.findOne({
      _id: id,
      companyId: session.user.companyId,
    });

    if (!contractor) {
      return NextResponse.json(
        { error: 'Contractor not found' },
        { status: 404 }
      );
    }

    contractor.status = status;

    await contractor.save();

    return NextResponse.json({
      message: `Contractor marked as ${status}`,
      contractor: formatContractor(contractor),
    });
  } catch (error) {
    console.error('PATCH /api/contractors error:', error);

    return NextResponse.json(
      { error: 'Failed to update contractor' },
      { status: 500 }
    );
  }
}