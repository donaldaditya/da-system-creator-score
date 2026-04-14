/**
 * RapidAPI profile fetcher — Task 3, Path 1
 *
 * TikTok: tiktok-scraper7.p.rapidapi.com
 *   Fetches followers, engagement rate (computed from recent videos), post frequency
 *
 * Instagram: instagram120.p.rapidapi.com
 *   Fetches followers, media count, profile pic
 *
 * Requires env: RAPIDAPI_KEY
 */

import { NextRequest, NextResponse } from "next/server";
import { Platform } from "@/types/creator";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY ?? "";

interface FetchedProfile {
  handle: string;
  platform: Platform;
  followers?: number;
  avgViews?: number;
  engagementRate?: number;
  postsLast30d?: number;
  avatarUrl?: string;
  error?: string;
}

async function fetchTikTok(handle: string): Promise<FetchedProfile> {
  if (!RAPIDAPI_KEY) return { handle, platform: Platform.TikTok, error: "RAPIDAPI_KEY not configured" };

  try {
    // User info
    const infoRes = await fetch(
      `https://tiktok-scraper7.p.rapidapi.com/user/info?unique_id=${encodeURIComponent(handle)}`,
      {
        headers: {
          "x-rapidapi-host": "tiktok-scraper7.p.rapidapi.com",
          "x-rapidapi-key": RAPIDAPI_KEY,
        },
      }
    );
    if (!infoRes.ok) throw new Error(`TikTok API ${infoRes.status}`);
    const info = await infoRes.json();
    const user = info?.data?.user ?? info?.userInfo?.user ?? info?.data ?? {};
    const stats = info?.data?.stats ?? info?.userInfo?.stats ?? info?.stats ?? {};

    const followers: number = stats?.followerCount ?? user?.followerCount ?? 0;
    const avatarUrl: string = user?.avatarThumb ?? user?.avatarMedium ?? "";

    // Recent videos for ER and posting frequency
    const postsRes = await fetch(
      `https://tiktok-scraper7.p.rapidapi.com/user/posts?unique_id=${encodeURIComponent(handle)}&count=20`,
      {
        headers: {
          "x-rapidapi-host": "tiktok-scraper7.p.rapidapi.com",
          "x-rapidapi-key": RAPIDAPI_KEY,
        },
      }
    );

    let avgViews: number | undefined;
    let engagementRate: number | undefined;
    let postsLast30d: number | undefined;

    if (postsRes.ok) {
      const postsData = await postsRes.json();
      const videos: Record<string, number>[] = postsData?.data?.videos ?? postsData?.videos ?? [];

      if (videos.length > 0) {
        const now = Date.now() / 1000;
        const cutoff = now - 30 * 24 * 3600;
        const recent = videos.filter((v: Record<string, number>) => (v.createTime ?? v.create_time ?? 0) >= cutoff);
        postsLast30d = recent.length;

        const totalViews = videos.reduce((s, v) => s + (v.playCount ?? v.play_count ?? 0), 0);
        avgViews = Math.round(totalViews / videos.length);

        // ER = avg (likes + comments + shares) / plays per video
        const totalER = videos.reduce((s, v) => {
          const plays = v.playCount ?? v.play_count ?? 1;
          const engage = (v.diggCount ?? v.digg_count ?? 0) +
                         (v.commentCount ?? v.comment_count ?? 0) +
                         (v.shareCount ?? v.share_count ?? 0);
          return s + (plays > 0 ? engage / plays : 0);
        }, 0);
        engagementRate = parseFloat(((totalER / videos.length) * 100).toFixed(2));
      }
    }

    return { handle, platform: Platform.TikTok, followers, avgViews, engagementRate, postsLast30d, avatarUrl };
  } catch (e) {
    return { handle, platform: Platform.TikTok, error: e instanceof Error ? e.message : String(e) };
  }
}

async function fetchInstagram(handle: string): Promise<FetchedProfile> {
  if (!RAPIDAPI_KEY) return { handle, platform: Platform.Instagram, error: "RAPIDAPI_KEY not configured" };

  try {
    const res = await fetch(
      `https://instagram120.p.rapidapi.com/v1/info?username_or_id=${encodeURIComponent(handle)}`,
      {
        headers: {
          "x-rapidapi-host": "instagram120.p.rapidapi.com",
          "x-rapidapi-key": RAPIDAPI_KEY,
        },
      }
    );
    if (!res.ok) throw new Error(`Instagram API ${res.status}`);
    const data = await res.json();
    const user = data?.data ?? data?.user ?? data ?? {};

    return {
      handle,
      platform: Platform.Instagram,
      followers: user.follower_count ?? user.edge_followed_by?.count ?? undefined,
      postsLast30d: undefined, // would need post list — not fetched by default (costs API calls)
      avatarUrl: user.profile_pic_url ?? user.profile_pic_url_hd ?? undefined,
    };
  } catch (e) {
    return { handle, platform: Platform.Instagram, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { handles, platform } = await req.json() as { handles: string[]; platform: string };

    if (!handles?.length) {
      return NextResponse.json({ error: "handles array required" }, { status: 400 });
    }

    const results: FetchedProfile[] = await Promise.all(
      handles.map((h) => {
        const clean = h.trim().replace(/^@/, "");
        if (platform === "instagram") return fetchInstagram(clean);
        return fetchTikTok(clean);
      })
    );

    return NextResponse.json({ profiles: results });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch profiles" },
      { status: 500 }
    );
  }
}
