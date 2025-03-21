import { ApplicationCommandData, ApplicationCommandOptionType } from 'discord.js'

export const pingCommandData: ApplicationCommandData = {
  name: 'ping',
  description: 'Replies with Pong!'
}
export const kickCommandData: ApplicationCommandData = {
  name: 'kick',
  description: 'Kick a user from the server',
  options: [
    {
      name: 'target',
      description: 'The user to kick',
      type: ApplicationCommandOptionType.User,
      required: true
    },
    {
      name: 'reason',
      description: 'Reason for kicking',
      type: ApplicationCommandOptionType.String,
      required: false
    }
  ]
}
export const banCommandData: ApplicationCommandData = {
  name: 'ban',
  description: 'Ban a user from the server',
  options: [
    {
      name: 'target',
      description: 'The user to ban',
      type: ApplicationCommandOptionType.User,
      required: true
    },
    {
      name: 'reason',
      description: 'Reason for banning',
      type: ApplicationCommandOptionType.String,
      required: false
    }
  ]
}
export const muteCommandData: ApplicationCommandData = {
  name: 'mute',
  description: 'Mute a user in the server',
  options: [
    {
      name: 'target',
      description: 'The user to mute',
      type: ApplicationCommandOptionType.User,
      required: true
    },
    {
      name: 'duration',
      description: 'Duration of mute in minutes',
      type: ApplicationCommandOptionType.Integer,
      required: true
    },
    {
      name: 'reason',
      description: 'Reason for muting',
      type: ApplicationCommandOptionType.String,
      required: false
    }
  ]
}
export const unmuteCommandData: ApplicationCommandData = {
  name: 'unmute',
  description: 'Unmute a user in the server',
  options: [
    {
      name: 'target',
      description: 'The user to unmute',
      type: ApplicationCommandOptionType.User,
      required: true
    }
  ]
}
export const slowmodeCommandData: ApplicationCommandData = {
  name: 'slowmode',
  description: 'Set slowmode for a channel',
  options: [
    {
      name: 'duration',
      description: 'Duration of slowmode in seconds',
      type: ApplicationCommandOptionType.Integer,
      required: true
    }
  ]
}

export const commands: ApplicationCommandData[] = [
  pingCommandData,
  // kickCommandData,
  // banCommandData,
  // slowmodeCommandData,
  // muteCommandData,
  // unmuteCommandData,
]