import { NextResponse } from 'next/server'
import { getMembers, updateMember } from '@/services/data'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const managerUid = searchParams.get('manager_uid')

    if (!managerUid) {
      return NextResponse.json(
        { success: false, message: '缺少 manager_uid 參數' },
        { status: 400 }
      )
    }

    const { members } = await getMembers(managerUid)

    const response = NextResponse.json({
      success: true,
      data: members
    })

    // CORS 設定
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type')

    return response
  } catch (err) {
    console.error('API Members Error:', err)
    return NextResponse.json(
      { success: false, message: '伺服器發生錯誤' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { uid, status } = body

    if (!uid) {
      return NextResponse.json(
        { success: false, message: '缺少 uid' },
        { status: 400 }
      )
    }

    await updateMember(uid, { status })

    return NextResponse.json({ success: true, message: '更新成功' })
  } catch (err) {
    console.error('API Update Member Error:', err)
    return NextResponse.json(
      { success: false, message: '更新失敗' },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 })
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
  return response
}
