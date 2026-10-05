const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr").replace(/\/+$/, "")
const SECRET = process.env.PUSH_WEBHOOK_SECRET

exports.handler = async () => {
  if (!SECRET) {
    console.error("process-onboarding-sources: PUSH_WEBHOOK_SECRET missing")
    return { statusCode: 500, body: "missing secret" }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25_000)

  try {
    const response = await fetch(APP_URL + "/api/partner-onboarding/process", {
      method: "POST",
      headers: { Authorization: "Bearer " + SECRET },
      signal: controller.signal,
    })
    const body = await response.text()
    if (!response.ok) {
      console.error("process-onboarding-sources failed", response.status, body)
    }
    return { statusCode: response.status, body }
  } catch (error) {
    console.error("process-onboarding-sources failed", error)
    return { statusCode: 500, body: "processing failed" }
  } finally {
    clearTimeout(timeout)
  }
}
