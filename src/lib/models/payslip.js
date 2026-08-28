import mongoose from 'mongoose';

const payslipSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },

    payrollRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PayrollRun',
      required: true,
      index: true,
    },

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },

    basicSalary: {
      type: Number,
      default: 0,
    },

    transportAllowance: {
      type: Number,
      default: 0,
    },

    housingAllowance: {
      type: Number,
      default: 0,
    },

    otherAllowance: {
      type: Number,
      default: 0,
    },

    grossSalary: {
      type: Number,
      default: 0,
    },

    taxableIncome: {
      type: Number,
      default: 0,
    },

    incomeTax: {
      type: Number,
      default: 0,
    },

    pensionEmployee: {
      type: Number,
      default: 0,
    },

    pensionEmployer: {
      type: Number,
      default: 0,
    },

    otherDeductions: {
      type: Number,
      default: 0,
    },

    netSalary: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

payrollRunSchemaIndex();

function payrollRunSchemaIndex() {
  payslipSchema.index(
    {
      payrollRunId: 1,
      employeeId: 1,
    },
    { unique: true }
  );
}

export default mongoose.models.Payslip ||
  mongoose.model('Payslip', payslipSchema);