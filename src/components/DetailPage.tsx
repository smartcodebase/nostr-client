import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { nip19, type Event } from "nostr-tools";
import { format } from "date-fns";
import {
  fetchTopLevelPosts,
  fetchMediaNotesForEvents,
  fetchRepliesToEventIds,
} from "../services/fetchRelayPosts";

function formatTimestamp(timestamp: number) {
  const now = Date.now();
  const created = timestamp * 1000;
  const diff = now - created;

  if (diff < 24 * 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }

  return format(created, "M/d/yyyy, h:mm a");
}

export default function DetailPage() {
  const { pubkey } = useParams();
  const [posts, setPosts] = useState<Event[]>([]);
  const [mediaNotes, setMediaNotes] = useState<Event[]>([]);
  const [replies, setReplies] = useState<Event[]>([]);
  const [replyMediaNotes, setReplyMediaNotes] = useState<Event[]>([]);

  useEffect(() => {
    if (!pubkey) return;
    const load = async () => {
      const fetchedPosts = await fetchTopLevelPosts(pubkey);
      setPosts(fetchedPosts);

      const postIds = fetchedPosts.map((p) => p.id);
      const fetchedMedia = await fetchMediaNotesForEvents(postIds);
      setMediaNotes(fetchedMedia);

      const fetchedReplies = await fetchRepliesToEventIds(postIds);
      setReplies(fetchedReplies);

      const replyIds = fetchedReplies.map((r) => r.id);
      const fetchedReplyMedia = await fetchMediaNotesForEvents(replyIds);
      setReplyMediaNotes(fetchedReplyMedia);
    };

    load();
  }, []);

  return (
    <div className="flex min-h-screen">
      <aside className="w-72 bg-base-200 p-6 shadow-md">
        <div className="flex flex-col items-center mb-8">
          <div className="avatar">
            <div className="w-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
              <img
                src="https://pbs.twimg.com/profile_images/1782477704278749185/Xf27TAWs_normal.jpg"
                alt="Profile"
              />
            </div>
          </div>
          <h2 className="font-bold mt-3 text-center">Josh Man</h2>
          <div className="flex gap-2 mt-3">
            <button
              className="btn btn-sm btn-square btn-outline"
              aria-label="Twitter"
            >
              <i className="bi bi-twitter text-xl" />
            </button>
            <button
              className="btn btn-sm btn-square btn-outline"
              aria-label="Facebook"
            >
              <i className="bi bi-facebook text-lg" />
            </button>
            <button
              className="btn btn-sm btn-square btn-outline"
              aria-label="Instagram"
            >
              <i className="bi bi-instagram text-lg" />
            </button>
          </div>
        </div>

        <div className="divider">Pagination</div>
        <div className="join">
          <button className="join-item btn">«</button>
          <button className="join-item btn">Page 1 of 64</button>
          <button className="join-item btn">»</button>
        </div>

        <div className="divider">Filter By</div>
        <div className="form-control flex flex-col gap-2">
          <label className="label cursor-pointer justify-start gap-2">
            <input type="checkbox" className="checkbox checkbox-accent" />
            <span className="label-text">Twitter</span>
          </label>
          <label className="label cursor-pointer justify-start gap-2">
            <input type="checkbox" className="checkbox checkbox-primary" />
            <span className="label-text">Facebook</span>
          </label>
          <label className="label cursor-pointer justify-start gap-2">
            <input type="checkbox" className="checkbox checkbox-secondary" />
            <span className="label-text">Instagram</span>
          </label>
        </div>

        <div className="divider">Date</div>
        <div className="space-y-2 text-sm">
          <details className="collapse collapse-arrow bg-base-200 rounded-lg">
            <summary className="collapse-title font-medium">2025</summary>
            <div className="collapse-content">
              <ul className="space-y-2 pl-2">
                <li className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm checkbox-info"
                  />
                  <span>December</span>
                </li>
                <li className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm checkbox-info"
                  />
                  <span>November</span>
                </li>
              </ul>
            </div>
          </details>
        </div>
      </aside>

      <main className="flex-1 bg-base-100 p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">Recent Posts</h1>
        <div className="space-y-4">
          {posts.map((post) => {
            const relatedMedia = mediaNotes.filter((media) =>
              media.tags.some((tag) => tag[0] === "e" && tag[1] === post.id)
            );

            const relatedReplies = replies.filter((reply) =>
              reply.tags.some((tag) => tag[0] === "e" && tag[1] === post.id)
            );

            return (
              <div key={post.id} className="card bg-base-100 shadow">
                <div className="card-body">
                  <div className="flex gap-1">
                    <div className="text-sm text-gray-500 shrink-0">
                      <i className="bi bi-twitter text-blue-500 mr-1" />
                      {new Date(post.created_at * 1000).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>

                    <div className="flex-1 space-y-4">
                      <p className="whitespace-pre-wrap">{post.content}</p>

                      {relatedMedia.map((media) => {
                        const url = media.tags.find(
                          (tag) => tag[0] === "url"
                        )?.[1];
                        const video = media.tags.find(
                          (tag) => tag[0] === "video"
                        )?.[1];
                        const type = media.tags.find(
                          (tag) => tag[0] === "m"
                        )?.[1];

                        return (
                          <div
                            key={media.id}
                            className="mt-4 w-full max-w-xl mx-auto"
                          >
                            {type === "photo" ? (
                              <img src={url} alt="media" className="rounded" />
                            ) : type === "video" && video ? (
                              <video
                                controls
                                className="rounded w-full aspect-video"
                              >
                                <source src={video} />
                              </video>
                            ) : null}
                          </div>
                        );
                      })}

                      {relatedReplies.length > 0 && (
                        <div className="mt-6">
                          <h3 className="font-semibold mb-2">Replies</h3>
                          <ul className="timeline timeline-vertical justify-start">
                            {relatedReplies
                              .sort((a, b) => b.created_at - a.created_at)
                              .map((reply, index) => {
                                const replyMedia = replyMediaNotes.filter(
                                  (media) =>
                                    media.tags.some(
                                      (tag) =>
                                        tag[0] === "e" && tag[1] === reply.id
                                    )
                                );

                                return (
                                  <li key={reply.id}>
                                    {index > 0 && <hr />}
                                    <div className="timeline-start">
                                      {formatTimestamp(reply.created_at)}
                                    </div>
                                    <div className="timeline-middle">
                                      <div className="h-3 w-3 bg-primary rounded-full"></div>
                                    </div>
                                    <div className="timeline-end timeline-box">
                                      <div className="text-xs text-gray-500 mb-1">
                                        @{nip19.npubEncode(reply.pubkey)}
                                      </div>
                                      <p className="mb-2 whitespace-pre-wrap">
                                        {reply.content}
                                      </p>

                                      {replyMedia.map((media) => {
                                        const url = media.tags.find(
                                          (tag) => tag[0] === "url"
                                        )?.[1];
                                        if (!url) return null;
                                        return /\.(jpg|jpeg|png|gif)(\?.*)?$/i.test(
                                          url
                                        ) ? (
                                          <img
                                            key={media.id}
                                            src={url}
                                            alt="Media"
                                            className="rounded mt-2 w-full max-w-md"
                                          />
                                        ) : /\.(mp4|webm)(\?.*)?$/i.test(
                                            url
                                          ) ? (
                                          <video
                                            key={media.id}
                                            controls
                                            className="rounded mt-2 w-full max-w-md mx-auto"
                                          >
                                            <source src={url} />
                                          </video>
                                        ) : null;
                                      })}
                                    </div>
                                  </li>
                                );
                              })}
                          </ul>
                        </div>
                      )}

                      <div className="text-sm text-gray-400 mt-2">
                        {new Date(post.created_at * 1000).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
