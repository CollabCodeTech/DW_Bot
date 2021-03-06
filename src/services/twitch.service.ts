import environment from '../environment';
import axios from 'axios';


const ch = environment.bot.channels[0].substr(1).toLowerCase();
const oauth = environment.bot.identity.password;
const id = environment.bot.client_id;

// DOCS: https://dev.twitch.tv/docs/v5/reference/streams/
export interface IStream {
  _id: number;
  game: string;
  viewers: number;
  video_height: number;
  average_fps: number;
  delay: number;
  create_at: string; // 2017-08-02T00:08:03Z
  is_playlist: boolean;
  stream_type: string;
  preview: object;
  channel: IChannel;
}

export interface IChannel {
  mature: boolean;
  partner: boolean;
  status: string;
  broadcaster_language: string;
  display_name: string;
  game: string;
  language: string;
  _id: number;
  name: string;
  created_at: string;
  updated_at: string;
  delay: number;
  logo: string;
  banner: string;
  video_banner: string;
  url: string;
  views: number;
  followers: number;
}

export interface IChatters {
  _links: any;
  chatter_count: number;
  chatters: {
    moderators: [string],
    staff: [string],
    admins: [string],
    global_mods: [string],
    viewers: [string],
  };
}

export async function getStreamInfo(channel: string = ch): Promise<IStream> {
  const stream = await axios
    .get(`https://api.twitch.tv/helix/streams?user_login=${channel}`, {
      headers: {
        'Client-ID': id,
      },
    });
  return stream.data.data[0];
}

export async function getViewers(channel = ch): Promise<IChatters | false> {
  const chatters =
    `https://tmi.twitch.tv/group/user/${channel}/chatters`;
  const request = await axios.get(chatters, {
    headers: {
      'Client-ID': oauth,
    },
  });
  if (request.status === 200) return request.data;
  return false;
}
