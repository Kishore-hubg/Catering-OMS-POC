import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { MenuService } from '@/lib/services/MenuService';

/**
 * GET /api/menu/export
 * Returns the full menu (including inactive) as JSON for backup.
 * Auth required.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const items = await MenuService.getAllIncludingInactive();
    const payload = {
      exportedAt: new Date().toISOString(),
      count: items.length,
      items,
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="menu-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    console.error('Menu export error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export menu' },
      { status: 500 }
    );
  }
}
