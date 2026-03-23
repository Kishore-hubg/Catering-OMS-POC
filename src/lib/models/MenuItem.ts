import mongoose, { Schema, Document } from 'mongoose';

export interface IMenuItem extends Document {
  name: string;
  category: string;
  description?: string;
  menuType: string;
  notes?: string;
  pricingOptions: {
    sizeOption: string;
    price: number | null;
    unit: string;
  }[];
  minOrder?: number;
  minOrderUnit?: string;
  isQuoteBased: boolean;
  isActive: boolean;
}

const PricingOptionSchema = new Schema(
  {
    sizeOption: { type: String, required: true },
    price: { type: Number, default: null },
    unit: { type: String, default: '' },
  },
  { _id: false }
);

const MenuItemSchema = new Schema(
  {
    name: { type: String, required: true, index: true },
    category: { type: String, required: true, index: true },
    description: { type: String },
    menuType: {
      type: String,
      required: true,
      enum: [
        'Veg Menu',
        'Non-Veg Menu',
        'Desserts',
        'Puja Food',
        'Live Catering',
        'Chafing Dishes',
        'Disposable Plates',
        'Drinks',
        'Breakfast',
      ],
      index: true,
    },
    notes: { type: String },
    pricingOptions: [PricingOptionSchema],
    minOrder: { type: Number },
    minOrderUnit: { type: String },
    isQuoteBased: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// Compound index for menu browsing
MenuItemSchema.index({ menuType: 1, category: 1, name: 1 });

export default mongoose.models.MenuItem ||
  mongoose.model<IMenuItem>('MenuItem', MenuItemSchema);
