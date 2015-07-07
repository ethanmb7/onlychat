var myNick


var motd = [
	"                            _           _         _       _   ",
	"                           | |_ ___ ___| |_   ___| |_ ___| |_ ",
	"                           |   |_ ||  _| '_| |  _|   |_ ||  _|",
	"                           |_|_|__/|___|_,_|.|___|_|_|__/|_|  ",
	"",
	"",
	"Welcome to hack.chat, a minimal chat service for humans.",
	"Channels are created and joined by going to hack.chat/?your-channel. There are no channel lists, so a secret channel name can be used for private discussions.",
	"",
	"Here are some pre-made channels you can join:",
	"http://hack.chat/?lobby",
	"http://hack.chat/?meta",
	"http://hack.chat/?asciiart",
	"And here's a random one generated just for you: http://hack.chat/?" + Math.random().toString(36).substr(2, 8),
	"",
	"",
	"",
	"",
	"Formatting:",
	"Whitespace is preserved, so source code can be shared properly.",
	"Surround LaTeX with $ for inline style $\\zeta(2) = \\pi^2/6$, or $$ for display.",
	"$$\\int_0^1 \\int_0^1 \\frac{1}{1-xy} dx dy = \\frac{\\pi^2}{6}$$",
	"",
	"",
	"Note that only the admin has a glowing nickname. All others claiming to be are impersonators.",
	"",
	"GitHub repo: https://github.com/AndrewBelt/hack.chat",
	"Server and client released under the GNU General Public License.",
	"No messages are retained on the hack.chat server.",
].join("\n")

function $(query) {return document.querySelector(query)}


window.onload = function() {
	loadScheme()

	var channel = window.location.search.replace(/^\?/, '')
	if (channel != '') {
		myNick = prompt('Nickname:')
		if (myNick) {
			join(channel, myNick)
		}
	}
	else {
		pushMessage('', motd)
	}
}


function join(channel, nick) {
	// var ws = new WebSocket('wss://' + document.domain + '/chat-ws')
	var ws = new WebSocket('ws://' + document.domain + ':6060')

	ws.onopen = function() {
		ws.send(JSON.stringify({cmd: 'join', channel: channel, nick: nick}))
	}

	ws.onmessage = function(message) {
		var args = JSON.parse(message.data)
		var cmd = args.cmd
		var command = COMMANDS[cmd]
		command.call(null, args)
	}

	ws.onclose = function() {
		pushMessage('!', "Server disconnected", Date.now(), 'warn')
	}

	// prepare footer
	$('#footer').classList.remove('hidden')
	$('#footer').onclick = function() {
		$('#chatinput').focus()
	}

	$('#chatinput').onkeydown = function(e) {
		if (e.keyCode == 13 && !e.shiftKey) {
			if ($('#chatinput').value != '') {
				ws.send(JSON.stringify({cmd: 'chat', text: $('#chatinput').value}))
				$('#chatinput').value = ''
				updateInputSize()
			}
			e.preventDefault()
		}
	}
	$('#chatinput').focus()
	$('#chatinput').addEventListener('input', function() {
		updateInputSize()
	})
	updateInputSize()

	// prepare sidebar
	$('#sidebar').onmouseenter = function() {
		$('#sidebar-content').classList.remove('hidden')
	}
	$('#sidebar').onmouseleave = function() {
		$('#sidebar-content').classList.add('hidden')
	}
}


var COMMANDS = {
	chat: function(args) {
		var cls
		if (args.admin) {
			cls = 'admin'
		}
		else if (myNick == args.nick) {
			cls = 'me'
		}
		pushMessage(args.nick, args.text, args.time, cls)
	},
	info: function(args) {
		pushMessage('*', args.text, args.time, 'info')
	},
	warn: function(args) {
		pushMessage('!', args.text, args.time, 'warn')
	},
	joined: function(args) {
		users[args.nick] = true
		updateUsers()
	},
	left: function(args) {
		delete users[args.nick]
		updateUsers()
	},
}


function updateInputSize() {
	var atBottom = isAtBottom()

	var input = $('#chatinput')
	input.style.height = 0
	input.style.height = input.scrollHeight + 'px'
	document.body.style.marginBottom = $('#footer').offsetHeight + 'px'

	if (atBottom) {
		window.scrollTo(0, document.body.scrollHeight)
	}
}


function pushMessage(nick, text, time, cls) {
	var messageEl = document.createElement('div')
	messageEl.classList.add('message')
	if (cls) {
		messageEl.classList.add(cls)
	}

	var nickEl = document.createElement('span')
	nickEl.classList.add('nick')
	nickEl.textContent = nick || ''
	if (time) {
		var date = new Date(time)
		nickEl.title = date.toLocaleString()
	}
	messageEl.appendChild(nickEl)

	var textEl = document.createElement('pre')
	textEl.classList.add('text')

	textEl.textContent = text || ''
	textEl.innerHTML = textEl.innerHTML.replace(/\$\$(\S.*?\S|\S)\$\$/g, parseMath)
	textEl.innerHTML = textEl.innerHTML.replace(/\$(\S.*?\S|\S)\$/g, parseMath)
	messageEl.appendChild(textEl)

	var atBottom = isAtBottom()
	$('#messages').appendChild(messageEl)
	if (atBottom) {
		window.scrollTo(0, document.body.scrollHeight)
	}

	unread += 1
	updateTitle()
}


function parseMath(g0, g1) {
	var display = (g0.substr(0, 2) == '$$')
	try {
		var div = document.createElement('div')
		div.innerHTML = g1
		var html = katex.renderToString(div.textContent, {displayMode: display})
		return html
	}
	catch (e) {
		console.warn(e)
		return g0
	}
}


var windowActive = true
var unread = 0

window.onfocus = function() {
	windowActive = true
	updateTitle()
}

window.onblur = function() {
	windowActive = false
}

window.onscroll = function() {
	if (isAtBottom()) {
		updateTitle()
	}
}

function isAtBottom() {
	return (window.innerHeight + window.scrollY) >= document.body.scrollHeight
}

function updateTitle() {
	if (windowActive && isAtBottom()) {
		unread = 0
	}

	var title = ''
	if (unread > 0) {
		title += '(' + unread + ') '
	}
	title += 'hack.chat'
	document.title = title
}

var users = {}

function updateUsers() {
	var usersArr = Object.keys(users)
	usersArr.sort()
	$('#users').textContent = usersArr.join("\n")
}


function setScheme(name) {
	$('#scheme-link').href = "schemes/" + name + ".css"
	if (localStorage) {
		localStorage['scheme'] = name
	}
}

function loadScheme() {
	if (localStorage) {
		var name = localStorage['scheme']
		if (name) {
			setScheme(name)
		}
	}
}