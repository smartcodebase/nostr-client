import { SimplePool, type Event } from "nostr-tools";

const RELAY_URL = import.meta.env.VITE_RELAY_URL!;

export interface NostrProfile {
  name?: string;
  display_name?: string;
  picture?: string;
  about?: string;
  website?: string;
}

export async function fetchTopLevelPosts(pubkey: string, limit = 100) {
  const pool = new SimplePool();
  const topLevelPosts: Event[] = [];

  await new Promise<void>((resolve) => {
    pool.subscribeMany(
      [RELAY_URL],
      [{ kinds: [1], authors: [pubkey], limit: 1000 }],
      {
        onevent(event) {
          // Skip replies (those containing an 'e' tag)
          const isReply = event.tags.some((tag) => tag[0] === "e");
          if (!isReply) {
            topLevelPosts.push(event);
          }

          // Stop when we have enough
          if (topLevelPosts.length >= limit) {
            pool.close([RELAY_URL]);
            resolve();
          }
        },
        oneose() {
          resolve();
        },
      }
    );
  });

  return topLevelPosts.slice(0, limit);
}

export async function fetchMediaNotesForEvents(eventIds: string[]) {
  const pool = new SimplePool();
  const media: Event[] = [];

  if (eventIds.length === 0) return media;

  const filters = eventIds.map((id) => ({ kinds: [30001], "#e": [id] }));

  await new Promise<void>((resolve) => {
    pool.subscribeMany([RELAY_URL], filters, {
      onevent(event) {
        media.push(event);
      },
      oneose() {
        resolve();
      },
    });
  });

  return media;
}

export async function fetchRepliesToEventIds(eventIds: string[]) {
  const pool = new SimplePool();
  const replies: Event[] = [];

  if (eventIds.length === 0) return replies;

  await new Promise<void>((resolve) => {
    pool.subscribeMany([RELAY_URL], [{ kinds: [1], "#e": eventIds }], {
      onevent(event) {
        replies.push(event);
      },
      oneose() {
        resolve();
      },
    });
  });

  return replies;
}
