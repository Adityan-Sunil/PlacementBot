const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { Options } = require('discord.js');
const { clientId, guildId, token } = require('./Keys/config.json');
// const { clientId, guildId, token } = JSON.parse(process.env.DISCORD_CONFIG);
console.log(clientId);
const commands = [
	new SlashCommandBuilder().setName('ping').setDescription('Replies with pong!'),
	new SlashCommandBuilder().setName('sync').setDescription('To be used by bot-owner only'),
	new SlashCommandBuilder().setName('list').setDescription('Sends the list of active placement opportunities available for you'),
	new SlashCommandBuilder().setName('register').setDescription('Register for placement updates').addStringOption(option => option.setName("data").setDescription("Enter your details: Name, CGPA, RegNo")),
	new SlashCommandBuilder().setName('register_m').setDescription('Register for placement updates')
		.addStringOption(option => option.setName("name").setDescription("Enter your Name"))
		.addStringOption(option => option.setName("cgpa").setDescription("Enter your CGPA"))
		.addStringOption(option => option.setName("regno").setDescription("Enter your RegNo"))

]
	.map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(token);

(async () => {
	try {
		await rest.put(
			Routes.applicationGuildCommands(clientId, guildId),
			{ body: commands },
		);

		console.log('Successfully registered application commands.');
	} catch (error) {
		console.error(error);
	}
})();