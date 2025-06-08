import { useEffect, useState } from "react";
import { SimplePool, nip19, type Event } from "nostr-tools";
import { finalizeEvent } from "nostr-tools";

import { fetchProfiles } from "../lib/nostr-profiles";

const RELAY_URL = "wss://testr.nymble.world";
const PUBLIC_RELAYS = ["wss://nos.lol"];
const PUBKEYS = [
  "b0c269c1da2ac18ef79a8027f4c8b043a0961889685514088808c86d75e9424a",
];

interface NostrProfile {
  name?: string;
  display_name?: string;
  picture?: string;
  about?: string;
  website?: string;
}

function hexToBytes(hex: string): Uint8Array {
  return new Uint8Array(hex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
}

export default function NostrProfilesViewer() {
  const [profiles, setProfiles] = useState<Record<string, NostrProfile>>({});
  const [posts, setPosts] = useState<Record<string, Event[]>>({});
  const [mediaNotes, setMediaNotes] = useState<Event[]>([]);
  const [replies, setReplies] = useState<Event[]>([]);
  const [replyingPostId, setReplyingPostId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [replyMediaNotes, setReplyMediaNotes] = useState<Event[]>([]);

  useEffect(() => {
    const load = async () => {
      const fetchedProfiles = await fetchProfiles(PUBKEYS, RELAY_URL);
      setProfiles(fetchedProfiles);

      const pool = new SimplePool();
      pool.subscribeMany(
        [RELAY_URL],
        [
          {
            kinds: [1],
            authors: PUBKEYS,
            // "#r": ["https://x.com/JoshMandell6/status/1926256418211934682"],
            limit: 10,
          },
        ],
        {
          onevent(event) {
            setPosts((prev) => {
              const userPosts = prev[event.pubkey] || [];
              if (userPosts.find((e) => e.id === event.id)) return prev;
              return {
                ...prev,
                [event.pubkey]: [event, ...userPosts],
              };
            });
          },
          oneose() {
            console.log("✅ Done fetching kind:1 posts");
            pool.close([RELAY_URL]);
          },
        }
      );
    };

    load();
  }, []);

  useEffect(() => {
    const allPostIds = Object.values(posts)
      .flat()
      .map((e) => e.id);
    if (allPostIds.length === 0) return;

    const pool = new SimplePool();
    const mediaFilters = allPostIds.map((id) => ({
      kinds: [30001],
      "#e": [id],
    }));
    const replyFilters = [{ kinds: [1], "#e": allPostIds }];

    pool.subscribeMany([RELAY_URL], mediaFilters, {
      onevent(event) {
        setMediaNotes((prev) => {
          const already = prev.find((n) => n.id === event.id);
          return already ? prev : [event, ...prev];
        });
      },
    });

    pool.subscribeMany([RELAY_URL], replyFilters, {
      onevent(event) {
        setReplies((prev) => {
          const already = prev.find((r) => r.id === event.id);
          return already ? prev : [...prev, event];
        });
      },
    });

    return () => pool.close([RELAY_URL]);
  }, [posts]);

  useEffect(() => {
    if (replies.length === 0) return;

    const replyIds = replies.map((r) => r.id);

    const replyMediaFilters = replyIds.map((id) => ({
      kinds: [30001],
      "#e": [id],
    }));

    const pool = new SimplePool();
    pool.subscribeMany([RELAY_URL], replyMediaFilters, {
      onevent(event) {
        setReplyMediaNotes((prev) => {
          const already = prev.find((n) => n.id === event.id);
          return already ? prev : [event, ...prev];
        });
      },
    });

    return () => pool.close([RELAY_URL]);
  }, [replies]);

  async function handleReply(postId: string) {
    const privHex =
      "625d938310d9578e59f31a09af49d4e54cce5f87f0fbc5c0a41e769ebcaf4693";
    const privKey = hexToBytes(privHex);
    const timestamp = Math.floor(Date.now() / 1000);

    // Public relays: kind:1 with media in content
    if (mediaUrl) {
      for (const url of PUBLIC_RELAYS) {
        const event = finalizeEvent(
          {
            kind: 1,
            // pubkey: pubKey,
            created_at: timestamp,
            // tags: [["e", postId]],
            tags: [
              [
                "e",
                "61468a9881167fe44ad31d3ea4e189176048a8362ed39ab9d2f5339f443d37f2",
              ],
            ],
            content: `${replyContent}\n\n${mediaUrl}`,
          },
          privKey
        );
        await new SimplePool().publish([url], event);
      }
    } else {
      for (const url of PUBLIC_RELAYS) {
        const event = finalizeEvent(
          {
            kind: 1,
            // pubkey: pubKey,
            created_at: timestamp,
            // tags: [["e", postId]],
            tags: [
              [
                "e",
                "61468a9881167fe44ad31d3ea4e189176048a8362ed39ab9d2f5339f443d37f2",
              ],
            ],
            content: replyContent,
          },
          privKey
        );
        await new SimplePool().publish([url], event);
      }
    }

    // Custom relay: kind:1 without media
    const textNote = finalizeEvent(
      {
        kind: 1,
        // pubkey: pubKey,
        created_at: timestamp,
        tags: [["e", postId]],
        content: replyContent,
      },
      privKey
    );
    await new SimplePool().publish([RELAY_URL], textNote);

    if (mediaUrl) {
      const mediaNote = finalizeEvent(
        {
          kind: 30001,
          // pubkey: pubKey,
          created_at: timestamp,
          tags: [
            ["e", textNote.id, "root"],
            ["url", mediaUrl],
            ["m", mediaUrl.endsWith(".mp4") ? "video" : "photo"],
          ],
          content: replyContent,
        },
        privKey
      );
      await new SimplePool().publish([RELAY_URL], mediaNote);
    }

    setReplyContent("");
    setMediaUrl("");
    setReplyingPostId(null);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">Nostr Viewer</h1>
      {Object.entries(profiles).map(([pubkey, profile]) => (
        <div
          key={pubkey}
          className="bg-white shadow-md rounded-xl p-6 mb-8 border"
        >
          <div className="flex items-center mb-4 space-x-4">
            <img
              src={profile.picture || "/default-avatar.png"}
              alt="avatar"
              className="w-16 h-16 rounded-full object-cover border"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/default-avatar.png";
              }}
            />
            <div>
              <h2 className="font-bold text-lg">
                {profile.display_name || profile.name || "Unnamed"}
              </h2>
              <p className="text-xs text-gray-500 break-all">{pubkey}</p>
            </div>
          </div>

          {(posts[pubkey] || []).map((post) => {
            const relatedMedia = mediaNotes.filter((media) =>
              media.tags.some((tag) => tag[0] === "e" && tag[1] === post.id)
            );

            const relatedReplies = replies.filter((reply) =>
              reply.tags.some((tag) => tag[0] === "e" && tag[1] === post.id)
            );

            return (
              <div key={post.id} className="mb-6 border-t pt-4">
                <pre className="whitespace-pre-wrap text-sm">
                  {post.content}
                </pre>
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(post.created_at * 1000).toLocaleString()}
                </div>

                {relatedMedia.map((media) => {
                  const imageUrl = media.tags.find(
                    (tag) => tag[0] === "url"
                  )?.[1];
                  const videoUrl = media.tags.find(
                    (tag) => tag[0] === "video"
                  )?.[1];
                  const mediaType = media.tags.find(
                    (tag) => tag[0] === "m"
                  )?.[1];

                  return (
                    <div
                      key={media.id}
                      className="mt-4 w-full max-w-xl mx-auto"
                    >
                      {mediaType === "photo" || mediaType === "animated_gif" ? (
                        <img
                          src={imageUrl}
                          alt="Media"
                          className="rounded w-full object-cover"
                        />
                      ) : mediaType === "video" && videoUrl ? (
                        <video controls className="rounded w-full aspect-video">
                          <source src={videoUrl} type="video/mp4" />
                        </video>
                      ) : null}
                    </div>
                  );
                })}

                {relatedReplies.map((reply) => {
                  const replyMedia = replyMediaNotes.filter((media) =>
                    media.tags.some(
                      (tag) => tag[0] === "e" && tag[1] === reply.id
                    )
                  );

                  return (
                    <div
                      key={reply.id}
                      className="mb-4 ml-4 pl-4 border-l border-gray-300 bg-gray-50 rounded-md p-3"
                    >
                      <div className="text-xs text-gray-500 mb-1">
                        @{nip19.npubEncode(reply.pubkey)}
                      </div>
                      <pre className="whitespace-pre-wrap text-sm mb-2">
                        {reply.content}
                      </pre>

                      <div className="mt-4 w-full max-w-xl mx-auto">
                        {replyMedia.map((media) => {
                          const mediaUrl = media.tags.find(
                            (tag) => tag[0] === "url"
                          )?.[1];

                          if (!mediaUrl) return null;

                          return /\.(jpg|jpeg|png|gif)(\?.*)?$/i.test(
                            mediaUrl
                          ) ? (
                            <img
                              key={media.id}
                              src={mediaUrl}
                              alt="Media"
                              className="rounded mt-2 w-full max-w-md"
                            />
                          ) : /\.(mp4|webm)(\?.*)?$/i.test(mediaUrl) ? (
                            <video
                              key={media.id}
                              controls
                              className="rounded mt-2 w-full max-w-md"
                            >
                              <source src={mediaUrl} />
                            </video>
                          ) : null;
                        })}
                      </div>
                    </div>
                  );
                })}

                <button
                  onClick={() =>
                    setReplyingPostId(
                      replyingPostId === post.id ? null : post.id
                    )
                  }
                  className="mt-2 text-sm text-blue-600 hover:underline"
                >
                  {replyingPostId === post.id ? "Cancel Reply" : "Reply"}
                </button>

                {replyingPostId === post.id && (
                  <div className="mt-2">
                    <textarea
                      className="w-full p-2 border rounded text-sm"
                      rows={2}
                      placeholder="Write your reply..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                    />
                    <input
                      type="text"
                      className="mt-1 p-2 border rounded w-full text-sm"
                      placeholder="Optional media URL (jpg/mp4)"
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                    />
                    <button
                      onClick={() => handleReply(post.id)}
                      className="mt-2 px-4 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      Send Reply
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
