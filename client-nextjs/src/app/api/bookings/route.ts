import { NextResponse } from 'next/server'
import { getBookings } from '@/services/data'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const managerUid = searchParams.get('manager_uid')
    const q = searchParams.get('q') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')

    if (!managerUid) {
      return NextResponse.json(
        { success: false, message: '缺少 manager_uid 參數' },
        { status: 400 }
      )
    }

    const result = await getBookings(managerUid, {
      searchTerm: q,
      page,
      pageSize
    })

    const response = NextResponse.json({
      success: true,
      data: result
    })

    // CORS 設定
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type')

    return response
  } catch (err) {
    console.error('API Bookings Error:', err)
    return NextResponse.json(
      { success: false, message: '伺服器發生錯誤' },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 })
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
  return response
}
