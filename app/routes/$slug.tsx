import type {ActionFunction, LinksFunction, LoaderArgs, V2_MetaFunction} from '@remix-run/node'
import {json} from '@remix-run/node'
import {useLoaderData} from '@remix-run/react'
import groq from 'groq'
import {PreviewSuspense} from '@sanity/preview-kit'

import type {loader as rootLoader} from '~/root'
import styles from '~/styles/app.css'
import Record, {PreviewRecord} from '~/components/Record'
import {getClient, writeClient} from '~/sanity/client'
import {recordZ} from '~/types/record'
import {getSession} from '~/sessions'
import {OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH} from './resource.og'

export const links: LinksFunction = () => {
  return [{rel: 'stylesheet', href: styles}]
}

export const meta: V2_MetaFunction<
  typeof loader,
  {
    root: typeof rootLoader
    'routes/$slug': typeof loader
  }
> = ({matches}) => {
  const recordMatch = matches.find((m) => m.id === 'routes/$slug') as typeof loader | undefined
  // Revisit when this is stable
  // @ts-expect-error
  const {record, ogImageUrl} = recordMatch ? recordMatch.data : {}

  const root = matches.find((m) => m.id === 'root') as typeof rootLoader | undefined
  // Revisit when this is stable
  // @ts-expect-error
  const {home} = root ? root.data : {}

  console.log(ogImageUrl)

  const title = [record.title, home.siteTitle].filter(Boolean).join(' | ')

  return [
    {title},
    {name: 'twitter:card', content: 'summary_large_image'},
    {name: 'twitter:title', content: title},
    {name: 'og:title', content: title},
    {name: 'og:image:width', content: String(OG_IMAGE_WIDTH)},
    {name: 'og:image:height', content: String(OG_IMAGE_HEIGHT)},
    {name: 'og:image', content: ogImageUrl},
  ]
}

// Perform a `like` or `dislike` mutation on a `record` document
export const action: ActionFunction = async ({request}) => {
  if (request.method !== 'POST') {
    return json({message: 'Method not allowed'}, 405)
  }

  const body = await request.formData()
  const id = String(body.get('id'))
  const action = String(body.get('action'))

  if (id) {
    switch (action) {
      case 'LIKE':
        return await writeClient
          .patch(id)
          .setIfMissing({likes: 0})
          .inc({likes: 1})
          .commit()
          .then(({likes, dislikes}) => ({likes: likes ?? 0, dislikes: dislikes ?? 0}))
      case 'DISLIKE':
        return await writeClient
          .patch(id)
          .setIfMissing({dislikes: 0})
          .inc({dislikes: 1})
          .commit()
          .then(({likes, dislikes}) => ({likes: likes ?? 0, dislikes: dislikes ?? 0}))
      default:
        return json({message: 'Invalid action'}, 400)
    }
  }

  return json({message: 'Bad request'}, 400)
}

// Load the `record` document with this slug
export const loader = async ({params, request}: LoaderArgs) => {
  const session = await getSession(request.headers.get('Cookie'))
  const token = session.get('token')
  const preview = Boolean(token)

  const query = groq`*[_type == "record" && slug.current == $slug][0]{
    _id,
    title,
    // GROQ can re-shape data in the request!
    "slug": slug.current,
    "artist": artist->title,
    // coalesce() returns the first value that is not null
    // so we can ensure we have at least a zero
    "likes": coalesce(likes, 0),
    "dislikes": coalesce(dislikes, 0),
    // for simplicity in this demo these are typed as "any"
    // we can make them type-safe with a little more work
    // https://www.simeongriggs.dev/type-safe-groq-queries-for-sanity-data-with-zod
    image,
    content,
    // this is how we extract values from arrays
    tracks[]{
      _key,
      title,
      duration
    }
  }`

  const record = await getClient(preview)
    // Params from the loader uses the filename
    // $slug.tsx has the params { slug: 'hello-world' }
    .fetch(query, params)
    // Parsed with Zod to validate data at runtime
    // and generate a Typescript type
    .then((res) => (res ? recordZ.parse(res) : null))

  if (!record) {
    throw new Response('Not found', {status: 404})
  }

  // Create social share image url
  const {origin} = new URL(request.url)
  const ogImageUrl = `${origin}/resource/og?id=${record._id}`

  return json({
    record,
    ogImageUrl,
    preview,
    query: preview ? query : null,
    params: preview ? params : null,
    // Note: This makes the token available to the client if they have an active session
    // This is useful to show live preview to unauthenticated users
    // If you would rather not, replace token with `null` and it will rely on your Studio auth
    token: preview ? token : null,
  })
}

export default function RecordPage() {
  const {record, preview, query, params, token} = useLoaderData<typeof loader>()

  if (preview && query && params && token) {
    return (
      <PreviewSuspense fallback={<Record {...record} />}>
        <PreviewRecord query={query} params={params} token={token} />
      </PreviewSuspense>
    )
  }

  return <Record {...record} />
}
