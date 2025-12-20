import { type NextRequest, NextResponse } from "next/server"
import { ANILIST_CONFIG } from "@/lib/anilist"

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  console.log("[v0] Callback received - code:", code ? "present" : "missing", "error:", error)

  if (error) {
    console.error("[v0] AniList OAuth error:", error)
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head><title>Auth Error</title></head>
        <body>
          <script>
            console.error('[v0] AniList auth error:', '${error}');
            window.opener?.postMessage({ type: 'anilist_error', error: '${error}' }, '*');
            window.close();
          </script>
          <p>Authentication failed. You can close this window.</p>
        </body>
      </html>
    `,
      { headers: { "Content-Type": "text/html" } },
    )
  }

  if (!code) {
    console.error("[v0] No code received in callback")
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head><title>Auth Error</title></head>
        <body>
          <script>
            console.error('[v0] No authorization code received');
            window.opener?.postMessage({ type: 'anilist_error', error: 'no_code' }, '*');
            window.close();
          </script>
          <p>No authorization code received. You can close this window.</p>
        </body>
      </html>
    `,
      { headers: { "Content-Type": "text/html" } },
    )
  }

  try {
    console.log("[v0] Exchanging code for token")

    const redirectUri = "https://anizonea.netlify.app/api/auth/anilist/callback"

    const tokenResponse = await fetch("https://anilist.co/api/v2/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: ANILIST_CONFIG.CLIENT_ID,
        client_secret: ANILIST_CONFIG.CLIENT_SECRET,
        redirect_uri: redirectUri,
        code,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error("[v0] Token exchange failed:", errorData)
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head><title>Auth Error</title></head>
          <body>
            <script>
              console.error('[v0] Token exchange failed:', ${JSON.stringify(errorData)});
              window.opener?.postMessage({ type: 'anilist_error', error: 'token_failed' }, '*');
              window.close();
            </script>
            <p>Failed to complete authentication. You can close this window.</p>
          </body>
        </html>
      `,
        { headers: { "Content-Type": "text/html" } },
      )
    }

    const { access_token } = await tokenResponse.json()
    console.log("[v0] Token received, fetching user data")

    const userResponse = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
      },
      body: JSON.stringify({
        query: `
          query {
            Viewer {
              id
              name
              avatar {
                large
                medium
              }
            }
          }
        `,
      }),
    })

    if (!userResponse.ok) {
      console.error("[v0] Failed to fetch user data")
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head><title>Auth Error</title></head>
          <body>
            <script>
              console.error('[v0] Failed to fetch user data');
              window.opener?.postMessage({ type: 'anilist_error', error: 'user_fetch_failed' }, '*');
              window.close();
            </script>
            <p>Failed to fetch user data. You can close this window.</p>
          </body>
        </html>
      `,
        { headers: { "Content-Type": "text/html" } },
      )
    }

    const userData = await userResponse.json()
    const user = userData.data.Viewer

    console.log("[v0] User data received:", user.name)

    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head><title>Authentication Successful</title></head>
        <body>
          <script>
            const user = ${JSON.stringify({ ...user, token: access_token })};
            console.log('[v0] Sending user data to parent window');
            
            // Store in localStorage
            localStorage.setItem('anilist_user', JSON.stringify(user));
            
            // Notify parent window
            if (window.opener) {
              window.opener.postMessage({ type: 'anilist_success', user }, '*');
              window.close();
            } else {
              // If no opener, redirect to lists page
              window.location.href = '/lists';
            }
          </script>
          <p>Authentication successful! Redirecting...</p>
        </body>
      </html>
    `,
      { headers: { "Content-Type": "text/html" } },
    )
  } catch (error) {
    console.error("[v0] Callback processing error:", error)
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head><title>Auth Error</title></head>
        <body>
          <script>
            console.error('[v0] Server error during authentication');
            window.opener?.postMessage({ type: 'anilist_error', error: 'server_error' }, '*');
            window.close();
          </script>
          <p>Server error during authentication. You can close this window.</p>
        </body>
      </html>
    `,
      { headers: { "Content-Type": "text/html" } },
    )
  }
}
