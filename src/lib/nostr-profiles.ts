import { Relay } from "nostr-tools";

interface NostrProfile {
  name?: string;
  display_name?: string;
  picture?: string;
  about?: string;
  website?: string;
}

export async function fetchProfiles(
  pubkeys: string[],
  relayUrl: string
): Promise<Record<string, NostrProfile>> {
  const relay = new Relay(relayUrl);
  await relay.connect();

  const profiles: Record<string, NostrProfile> = {};

  return new Promise((resolve) => {
    let resolved = false;

    const sub = relay.subscribe(
      [
        {
          kinds: [0],
          authors: pubkeys,
        },
      ],
      {
        onevent(event) {
          try {
            const metadata = JSON.parse(event.content);
            console.log("✅ Profile for", event.pubkey, metadata);
            profiles[event.pubkey] = metadata;
          } catch (err) {
            console.error("❌ Invalid metadata JSON:", err);
          }
        },
        oneose() {
          console.log("✅ Done fetching kind:0 metadata.");
          sub.close();
          relay.close();
          if (!resolved) {
            resolved = true;
            resolve(profiles);
          }
        },
      }
    );

    // Fallback timeout in case EOSE is never fired
    setTimeout(() => {
      if (!resolved) {
        console.warn("⚠️ Relay fetch timed out. Closing manually.");
        sub.close();
        relay.close();
        resolve(profiles);
      }
    }, 5000);
  });
}
