import type {LinksFunction, LoaderArgs} from '@remix-run/node'
import {json} from '@remix-run/node'
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useLocation,
} from '@remix-run/react'
import groq from 'groq'
import {z} from 'zod'

import {getClient} from '~/sanity/client'
import {homeZ} from '~/types/home'
import {themePreferenceCookie} from '~/cookies'
import {getBodyClassNames} from '~/lib/getBodyClassNames'

export const links: LinksFunction = () => {
  return [
    {rel: 'preconnect', href: 'https://cdn.sanity.io'},
    {rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous'},
    {rel: 'preconnect', href: 'https://fonts.googleapis.com', crossOrigin: 'anonymous'},
    {
      href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;700&family=Inter:wght@500;700;800&family=PT+Serif:ital,wght@0,400;0,700;1,400;1,700&display=swap',
      rel: 'stylesheet',
    },
  ]
}

export const loader = async ({request}: LoaderArgs) => {
  // Dark/light mode
  const cookieHeader = request.headers.get('Cookie')
  const cookie = (await themePreferenceCookie.parse(cookieHeader)) || {}
  const themePreference = z
    .union([z.literal('dark'), z.literal('light')])
    .optional()
    .parse(cookie.themePreference)

  // Sanity content throughout the site
  const query = groq`*[_id == "home"][0]{
    title,
    siteTitle
  }`
  const home = await getClient()
    .fetch(query)
    .then((res) => (res ? homeZ.parse(res) : null))

  return json({
    home,
    themePreference,
    ENV: {
      SANITY_PUBLIC_PROJECT_ID: process.env.SANITY_PUBLIC_PROJECT_ID,
      SANITY_PUBLIC_DATASET: process.env.SANITY_PUBLIC_DATASET,
      SANITY_PUBLIC_API_VERSION: process.env.SANITY_PUBLIC_API_VERSION,
    },
  })
}

export default function App() {
  const {ENV, themePreference} = useLoaderData<typeof loader>()

  const {pathname} = useLocation()
  const isStudioRoute = pathname.startsWith('/studio')
  const bodyClassNames = getBodyClassNames(themePreference)

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
        {isStudioRoute && typeof document === 'undefined' ? '__STYLES__' : null}
      </head>
      <body className={bodyClassNames}>
        <Outlet />
        <ScrollRestoration />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(ENV)}`,
          }}
        />
        <Scripts />
        {/* TODO: Is <LiveReload /> component responsible for live preview updates? Can we fix it such that when longer tasks such as uploading an image is occuring, the live preview should not break. */}
        <LiveReload />
      </body>
    </html>
  )
}
