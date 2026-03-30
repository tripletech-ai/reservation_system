import { NextResponse } from 'next/server'


export async function POST(request: Request) {
  // try {
  //   const { account, password } = await request.json()
  //   const result = await verifyManagerLogin(account, password)

  //   const response = NextResponse.json(result, { 
  //     status: result.success ? 200 : 401 
  //   })

  //   // CORS 跨網域設定
  //   response.headers.set('Access-Control-Allow-Origin', '*')
  //   response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  //   response.headers.set('Access-Control-Allow-Headers', 'Content-Type')

  //   return response
  // } catch (err) {
  //   console.error('API Login error:', err)
  //   const response = NextResponse.json(
  //     { success: false, message: '伺服器發生錯誤' },
  //     { status: 500 }
  //   )
  //   response.headers.set('Access-Control-Allow-Origin', '*')
  //   return response
  // }
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 })
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
  return response
}
