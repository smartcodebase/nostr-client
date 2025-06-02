import { useEffect, useState } from "react";
import { SimplePool, nip19 } from "nostr-tools";
import type { Event } from "nostr-tools";

const RELAY_URLS = ["wss://testr.nymble.world"];
// const RELAY_URLS = [
//   "wss://testr.nymble.world",
//   "wss://relay.damus.io",
//   "wss://nos.lol",
// ];

export default function NostrFeed() {
  const [textNotes, setTextNotes] = useState<Event[]>([]);
  const [mediaNotes, setMediaNotes] = useState<Event[]>([]);

  // 1. Subscribe to kind:1 tweets
  useEffect(() => {
    const pool = new SimplePool();

    try {
      pool.subscribeMany(
        RELAY_URLS,
        // [{ kinds: [1], limit: 50 }],
        // [
        //   {
        //     kinds: [1],
        //     "#r": ["https://x.com/PeterMcCormack/status/1923771241233592625"],
        //   },
        // ],
        // [
        //   {
        //     kinds: [1],
        //     "#r": ["https://x.com/PeterMcCormack/status/1923075776301146409"],
        //   },
        // ],
        // [
        //   {
        //     kinds: [1],
        //     "#r": ["https://x.com/JoshMandell6/status/1925075011510899150"],
        //   },
        // ],
        [
          {
            kinds: [1],
            "#r": [
              "https://x.com/jimmysong/status/1926008036713226244",
              "https://x.com/JoshMandell6/status/1926256418211934682",
            ],
          },
        ],

        {
          onevent(event) {
            setTextNotes((prev) => {
              const already = prev.find((n) => n.id === event.id);
              return already ? prev : [event, ...prev];
            });
          },
          oneose() {
            console.log("👋 Done receiving.");
          },
        }
      );
    } catch (error) {
      console.error("❌ Error querying relay:", error);
      pool.close(RELAY_URLS);
    }

    return () => pool.close(RELAY_URLS);
  }, []);

  // 2. Once we have tweet notes, subscribe to matching media
  useEffect(() => {
    if (textNotes.length === 0) return;

    const pool = new SimplePool();

    const ids = textNotes.map((n) => n.id);
    const filters = ids.map((id) => ({
      kinds: [30001],
      "#e": [id],
    }));

    pool.subscribeMany(RELAY_URLS, filters, {
      onevent(event) {
        setMediaNotes((prev) => {
          const already = prev.find((n) => n.id === event.id);
          return already ? prev : [event, ...prev];
        });
      },
    });

    return () => pool.close(RELAY_URLS);
  }, [textNotes]);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Nostr Tweet Viewer</h1>
      <ul className="mt-4 space-y-6">
        {textNotes.map((note) => {
          const npub = nip19.npubEncode(note.pubkey);
          const tweetLink = note.tags.find((tag) => tag[0] === "r")?.[1];

          const relatedMedia = mediaNotes.filter((media) =>
            media.tags.some((tag) => tag[0] === "e" && tag[1] === note.id)
          );

          return (
            <li key={note.id} className="border-b pb-4">
              <div className="text-sm text-gray-500">Posted by @{npub}</div>
              <pre className="whitespace-pre-wrap mt-1">{note.content}</pre>
              {relatedMedia.map((media) => {
                const imageUrl = media.tags.find(
                  (tag) => tag[0] === "url"
                )?.[1];
                const videoUrl = media.tags.find(
                  (tag) => tag[0] === "video"
                )?.[1];
                const mediaType = media.tags.find((tag) => tag[0] === "m")?.[1];
                if (mediaType === "photo" || mediaType === "animated_gif") {
                  return (
                    <img
                      key={media.id}
                      src={imageUrl}
                      alt="Media"
                      className="mt-2 rounded"
                    />
                  );
                }

                if (mediaType === "video" && videoUrl) {
                  return (
                    <video key={media.id} controls className="mt-2 max-w-full">
                      <source src={videoUrl} type="video/mp4" />
                    </video>
                  );
                }

                return null;
              })}
              {tweetLink && (
                <div className="mt-2">
                  <a
                    href={tweetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    View Original Tweet
                  </a>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
