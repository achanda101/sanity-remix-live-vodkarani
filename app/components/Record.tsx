import {definePreview} from '@sanity/preview-kit'

import SanityContent from '~/components/SanityContent'
import {projectDetails} from '~/sanity/projectDetails'
import type {RecordDocument} from '~/types/record'
import Layout from '~/components/Layout'
import Title from '~/components/Title'
import AlbumCover from '~/components/RecordCover'
import {secondsToMinutes} from '~/lib/secondsToMinutes'
import LikeDislike from '~/components/LikeDislike'
import ExitPreview from '~/components/ExitPreview'

export default function Record(props: RecordDocument) {
  const {_id, title, artist, content, image, tracks, likes, dislikes} = props

  return (
    <Layout>
      <article className="flex flex-col items-start gap-4 lg:flex-row lg:gap-12">
        <div className="grid-gap-4 mx-auto grid max-w-[70vw] grid-cols-1">
          <AlbumCover image={image} title={title} />
          <LikeDislike id={_id} likes={likes} dislikes={dislikes} />
        </div>
        <div className="flex flex-shrink-0 flex-col gap-4 md:gap-6 lg:w-2/3">
          <header>
            {title ? <Title>{title}</Title> : null}
            {artist ? (
              <h2 className="bg-black text-2xl font-bold tracking-tighter text-white">{artist}</h2>
            ) : null}
          </header>
          {content && content?.length > 0 ? <SanityContent value={content} /> : null}
          {tracks && tracks?.length > 0 ? (
            <>
              <ul className="grid grid-cols-1 divide-y divide-gray-100 dark:divide-gray-900">
                <li className="py-3 text-2xl font-bold tracking-tighter">
                  {tracks?.length === 1 ? `1 Track` : `${tracks?.length} Tracks`}
                </li>
                {tracks.map((track) => (
                  <li key={track._key} className="flex items-center justify-between py-3">
                    <span className="text-lg">{track.title}</span>
                    {track.duration ? (
                      <span className="text-sm font-bold">{secondsToMinutes(track.duration)}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </article>
    </Layout>
  )
}

type PreviewRecordProps = {
  query: string
  params: {[key: string]: string}
  token: string | null
}

const {projectId, dataset} = projectDetails()
const usePreview = definePreview({projectId, dataset})

export function PreviewRecord(props: PreviewRecordProps) {
  const {query, params, token} = props

  const data = usePreview(token ?? null, query, params)

  return (
    <>
      <ExitPreview />
      <Record {...data} />
    </>
  )
}
