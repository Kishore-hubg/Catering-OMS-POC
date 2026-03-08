import { connectDB } from '@/lib/db';
import MenuItem from '@/lib/models/MenuItem';
import type { MenuType, MenuItem as MenuItemType } from '@/types';

export class MenuService {
  static async getAll(filters?: { menuType?: MenuType; category?: string; search?: string }) {
    await connectDB();

    const query: Record<string, unknown> = { isActive: true };

    if (filters?.menuType) query.menuType = filters.menuType;
    if (filters?.category) query.category = filters.category;
    if (filters?.search) {
      query.name = { $regex: filters.search, $options: 'i' };
    }

    return MenuItem.find(query).sort({ menuType: 1, category: 1, name: 1 }).lean();
  }

  static async getAllIncludingInactive(filters?: { menuType?: MenuType; category?: string; search?: string }) {
    await connectDB();

    const query: Record<string, unknown> = {};

    if (filters?.menuType) query.menuType = filters.menuType;
    if (filters?.category) query.category = filters.category;
    if (filters?.search) {
      query.name = { $regex: filters.search, $options: 'i' };
    }

    return MenuItem.find(query).sort({ menuType: 1, category: 1, name: 1 }).lean();
  }

  static async getById(id: string) {
    await connectDB();
    return MenuItem.findById(id).lean();
  }

  static async getCategories(menuType: MenuType) {
    await connectDB();
    const categories = await MenuItem.distinct('category', {
      menuType,
      isActive: true,
    });
    return categories.sort();
  }

  static async getMenuTypes() {
    await connectDB();
    const types = await MenuItem.distinct('menuType', { isActive: true });
    return types;
  }

  static async getGroupedMenu() {
    await connectDB();
    const items = await MenuItem.find({ isActive: true })
      .sort({ menuType: 1, category: 1, name: 1 })
      .lean();

    const grouped: Record<string, Record<string, typeof items>> = {};

    for (const item of items) {
      if (!grouped[item.menuType]) grouped[item.menuType] = {};
      if (!grouped[item.menuType][item.category]) grouped[item.menuType][item.category] = [];
      grouped[item.menuType][item.category].push(item);
    }

    return grouped;
  }

  static async search(term: string) {
    await connectDB();
    return MenuItem.find({
      isActive: true,
      $or: [
        { name: { $regex: term, $options: 'i' } },
        { category: { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } },
      ],
    })
      .sort({ menuType: 1, name: 1 })
      .lean();
  }

  static async update(
    id: string,
    data: Partial<{
      name: string;
      category: string;
      description: string;
      menuType: MenuType;
      notes: string;
      pricingOptions: { sizeOption: string; price: number | null; unit: string }[];
      minOrder: number;
      minOrderUnit: string;
      isQuoteBased: boolean;
      isActive: boolean;
    }>
  ) {
    await connectDB();
    const updated = await MenuItem.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    ).lean();
    return updated;
  }

  /** Find one item by name + category + menuType (for import matching) */
  static async findByNaturalKey(name: string, category: string, menuType: string): Promise<MenuItemType | null> {
    await connectDB();
    return MenuItem.findOne({ name: name.trim(), category: category.trim(), menuType }).lean() as Promise<MenuItemType | null>;
  }
}
