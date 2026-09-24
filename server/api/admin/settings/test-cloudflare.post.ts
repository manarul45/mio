import { serverSupabaseUser } from '#supabase/server'
import crypto from 'crypto'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event)
  const {
    cloudflare_account_id: accountId,
    cloudflare_r2_access_key_id: accessKey,
    cloudflare_r2_secret_access_key: secretKey,
    cloudflare_r2_bucket: bucket,
    cloudflare_r2_public_domain: publicDomain,
  } = body || {}

  if (!accountId || !accessKey || !secretKey || !bucket) {
    return {
      success: false,
      message: 'Lengkapi Account ID, Access Key ID, Secret Access Key, dan Bucket Name terlebih dahulu.',
    }
  }

  const testKey = `test-connection/ping-${Date.now()}.txt`
  const testContent = `MIO Learning Academy Cloudflare R2 connection test at ${new Date().toISOString()}`
  const contentType = 'text/plain'

  try {
    const host = `${accountId}.r2.cloudflarestorage.com`
    const endpoint = `https://${host}/${bucket}/${testKey}`
    const region = 'auto'
    const service = 's3'

    const now = new Date()
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
    const dateStamp = amzDate.substring(0, 8)

    const payloadHash = crypto.createHash('sha256').update(testContent).digest('hex')
    const canonicalUri = `/${bucket}/${testKey}`
    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date'

    const canonicalRequest = `PUT\n${canonicalUri}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`
    const algorithm = 'AWS4-HMAC-SHA256'
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
    const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n` + crypto.createHash('sha256').update(canonicalRequest).digest('hex')

    const hmac = (key: any, string: string) => crypto.createHmac('sha256', key).update(string).digest()
    const kDate = hmac(`AWS4${secretKey}`, dateStamp)
    const kRegion = hmac(kDate, region)
    const kService = hmac(kRegion, service)
    const kSigning = hmac(kService, 'aws4_request')
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex')

    const authorizationHeader = `${algorithm} Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

    const res = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Host': host,
        'x-amz-date': amzDate,
        'x-amz-content-sha256': payloadHash,
        'Authorization': authorizationHeader,
        'Content-Type': contentType,
      },
      body: testContent,
    })

    if (res.ok) {
      const cdnUrl = publicDomain
        ? `${publicDomain.replace(/\/+$/, '')}/${testKey}`
        : `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${testKey}`

      return {
        success: true,
        message: 'Koneksi ke Cloudflare R2 & CDN Berhasil! File uji coba berhasil diunggah.',
        test_file_url: cdnUrl,
      }
    } else {
      const text = await res.text()
      return {
        success: false,
        message: `Gagal mengunggah file ke Cloudflare R2 (HTTP ${res.status}): ${text.substring(0, 200)}`,
      }
    }
  } catch (err: any) {
    return {
      success: false,
      message: 'Error koneksi Cloudflare: ' + (err.message || 'Terjadi kesalahan sistem'),
    }
  }
})
