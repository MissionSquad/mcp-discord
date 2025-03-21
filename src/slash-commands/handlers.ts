import {
  ChatInputCommandInteraction,
  Client,
  Collection,
  GuildMember,
  Interaction,
  PermissionFlagsBits
} from 'discord.js'
import { UserError } from 'fastmcp'
import { z } from 'zod'
import { tokenErrorMessage } from '../shared.js'
import { commands } from './commands.js'

// Handle the ping command
async function handlePing(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.reply('Pong!')
}


// Handle the kick command
async function handleKick(interaction: ChatInputCommandInteraction): Promise<void> {
  // Only run in a guild
  if (!interaction.guild) {
    await interaction.reply({ 
      content: 'This command can only be used in a server.', 
      ephemeral: true 
    })
    return
  }

  // Check if the user has permission to kick
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.KickMembers)) {
    await interaction.reply({ 
      content: 'You do not have permission to kick users.', 
      ephemeral: true 
    })
    return
  }

  const targetUser = interaction.options.getUser('target')
  if (!targetUser) {
    await interaction.reply({ 
      content: 'Invalid user.', 
      ephemeral: true 
    })
    return
  }

  const targetMember = interaction.options.getMember('target') as GuildMember | null
  if (!targetMember) {
    await interaction.reply({ 
      content: 'User is not in this server.', 
      ephemeral: true 
    })
    return
  }

  // Check if the bot can kick the user
  if (!targetMember.kickable) {
    await interaction.reply({ 
      content: 'I do not have permission to kick this user.', 
      ephemeral: true 
    })
    return
  }

  const reason = interaction.options.getString('reason') || 'No reason provided'

  try {
    await targetMember.kick(reason)
    await interaction.reply(`Successfully kicked ${targetUser.tag} for reason: ${reason}`)
  } catch (error) {
    console.error('Error kicking user:', error)
    await interaction.reply({ 
      content: 'Failed to kick user. Please check my permissions and try again.', 
      ephemeral: true 
    })
  }
}



// Handle the ban command
async function handleBan(interaction: ChatInputCommandInteraction): Promise<void> {
  // Only run in a guild
  if (!interaction.guild) {
    await interaction.reply({ 
      content: 'This command can only be used in a server.', 
      ephemeral: true 
    })
    return
  }

  // Check if the user has permission to ban
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
    await interaction.reply({ 
      content: 'You do not have permission to ban users.', 
      ephemeral: true 
    })
    return
  }

  const targetUser = interaction.options.getUser('target')
  if (!targetUser) {
    await interaction.reply({ 
      content: 'Invalid user.', 
      ephemeral: true 
    })
    return
  }

  const targetMember = interaction.options.getMember('target') as GuildMember | null
  if (targetMember && !targetMember.bannable) {
    await interaction.reply({ 
      content: 'I do not have permission to ban this user.', 
      ephemeral: true 
    })
    return
  }

  const reason = interaction.options.getString('reason') || 'No reason provided'

  try {
    await interaction.guild.members.ban(targetUser, { reason })
    await interaction.reply(`Successfully banned ${targetUser.tag} for reason: ${reason}`)
  } catch (error) {
    console.error('Error banning user:', error)
    await interaction.reply({ 
      content: 'Failed to ban user. Please check my permissions and try again.', 
      ephemeral: true 
    })
  }
}


// Handle the slowmode command
async function handleSlowmode(interaction: ChatInputCommandInteraction): Promise<void> {
  // Only run in a guild
  if (!interaction.guild) {
    await interaction.reply({ 
      content: 'This command can only be used in a server.', 
      ephemeral: true 
    })
    return
  }

  // Check if the user has permission to manage channels
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.reply({ 
      content: 'You do not have permission to manage channels.', 
      ephemeral: true 
    })
    return
  }

  // Check if the channel is a text channel
  if (!interaction.channel || !('setRateLimitPerUser' in interaction.channel)) {
    await interaction.reply({ 
      content: 'This command can only be used in a text channel.', 
      ephemeral: true 
    })
    return
  }

  const seconds = interaction.options.getInteger('seconds', true)
  
  try {
    await interaction.channel.setRateLimitPerUser(seconds, 'Slowmode set via slash command')
    
    if (seconds === 0) {
      await interaction.reply('Slowmode has been disabled for this channel.')
    } else {
      await interaction.reply(`Slowmode has been set to ${seconds} second(s) for this channel.`)
    }
  } catch (error) {
    console.error('Error setting slowmode:', error)
    await interaction.reply({ 
      content: 'Failed to set slowmode. Please check my permissions and try again.', 
      ephemeral: true 
    })
  }
}

// Handle a command interaction
async function handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const { commandName } = interaction

  switch (commandName) {
    case 'ping':
      await handlePing(interaction)
      break
    case 'kick':
      await handleKick(interaction)
      break
    case 'ban':
      await handleBan(interaction)
      break
    case 'slowmode':
      await handleSlowmode(interaction)
      break
    default:
      await interaction.reply({ 
        content: 'Unknown command', 
        ephemeral: true 
      })
  }
}

// Set up interaction handlers for a Discord client
export function setupSlashCommandInteractionHandlers(client: Client): void {
  // Check if we've already set up handlers for this client
  if ((client as any)._interactionHandlersSet) {
    return;
  }
  
  const handleInteraction = async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;
    
    try {
      await handleCommand(interaction);
    } catch (error) {
      console.error('Error handling command:', error);
      
      // Only reply if the interaction hasn't been replied to yet
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ 
          content: 'An error occurred while executing this command.', 
          ephemeral: true 
        }).catch(console.error);
      } else {
        await interaction.reply({ 
          content: 'An error occurred while executing this command.', 
          ephemeral: true 
        }).catch(console.error);
      }
    }
  };
  
  client.on('interactionCreate', handleInteraction);
  
  // Mark that we've set up handlers for this client
  (client as any)._interactionHandlersSet = true;
}
