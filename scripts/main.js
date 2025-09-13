const socket = io("https://bettercrewl.ink/", {transports: ['websocket']});
function $(id) { return document.getElementById(id); }

const lobbyTableBody = $('lobbies-body')
const lobbyTableTemplate = $('lobby-template')

var lobbyCodeIds = {}

socket.on('update_lobby', lobby => {
  console.log("Updating lobby...");
  console.log(lobby);
  const lobbyHTML = $(`lobby_${lobby.id}`);
  if (lobbyHTML) {
    lobbyHTML.innerHTML = formatLobby(lobby);
    assignLobbyCode(lobby);
    // }, 0)
  }
})
socket.on('new_lobbies', lobbies => {
  console.log("Creating new lobbies...");
  const sorted_lobbies = [];
  for (const lobby of lobbies) {
    console.log(lobby);
    if ($('lobby_'+lobby.id)) {
      $(`lobby_${lobby.id}`).remove();
    }
    sorted_lobbies.push([lobby.id, formatLobby(lobby)]);
    assignLobbyCode(lobby);
  }
  sorted_lobbies.sort((a, b) => a[0] > b[0] ? 1 : -1);
  for (const lobby of sorted_lobbies) {
    lobbyTableBody.insertAdjacentHTML('beforeend', lobby[1]);
  }
})
socket.on('remove_lobby', lobby => {
  console.log("Removed lobby...");
  $(`lobby_${lobby.id}`)?.remove();
  console.log(lobby);
})

// Formats
function formatLobby(lobby) {
  return lobbyTableTemplate.innerHTML.replaceAll(
    "{{id}}", lobby.id).replace(
    "{{name}}", lobby.title).replace(
    "{{host}}", lobby.host).replace(
    "{{players}}", `${lobby.current_players}/${lobby.max_players}`).replace(
    "{{mods}}", formatMods(lobby.mods)).replace(
    "{{language}}", languages[lobby.language] ?? "Unknown").replace(
    "{{server}}", (lobbyCodeIds[lobby.id] ?? [])[0] ?? "Loading...").replace( // handled above
    "{{code}}", (lobbyCodeIds[lobby.id] ?? [])[1] ?? "Loading...").replace(
    "{{status}}", lobby.gameState
  );
}
function formatMods(lobbyName) {
  return mods[lobbyName] ?? "Unknown mod: " + lobbyName;
}
function formatServer(serverIP) {
  return servers[serverIP] ?? "Unknown server: " + serverIP;
}

function assignLobbyCode(lobby) {
  let lobbyServer = $(`lobby-server_${lobby.id}`);
  let lobbyCode = $(`lobby-code_${lobby.id}`);
  if (!lobbyServer) {
    return setTimeout(assignLobbyCode, 1000, lobby);
  }
  if (!lobby.isPublic) {
    lobbyServer.innerHTML = "Private";
    lobbyCode.innerHTML = "Private";
    return;
  }
  if ((lobbyCodeIds[lobby.id] ?? [])[1]) { // we want to never re-assign codes to in game
    lobbyServer.innerHTML = lobbyCodeIds[lobby.id][0];
    lobbyCode.innerHTML = lobbyCodeIds[lobby.id][1];
    return;
  }
  if (lobby.gameState !== 0) {
    lobbyServer.innerHTML = "In game!";
    lobbyCode.innerHTML = "In game!";
    return;
  }
  console.log("Getting code for lobby "+lobby.id);
  socket?.emit("join_lobby", lobby.id,
    (state, codeOrError, server, publicLobby) => {
      if (codeOrError.length === 4 || codeOrError.length === 6) {
        lobbyCodeIds[publicLobby.id] = [formatServer(server), codeOrError];
        lobbyServer.innerHTML = formatServer(server);
        lobbyCode.innerHTML = codeOrError;
        return;
      } else {
        console.log(`Malformed length for code ${codeOrError} (${codeOrError.length})!`);
      }
      if (codeOrError === "Lobby is not public anymore") {
        throw new Error(`Lobby ${lobby.id} (${lobby.title}) is now private!`)
      }
    })
}


// Load resources
let mods;
let languages;
let servers;
Promise.all([
  fetch("/static/mods.json").then(
    response => response.json()).then(
    json => { mods = json; }
  ),
  fetch("/static/languages.json").then(
    response => response.json()).then(
      json => { languages = json; }
  ),
  fetch("/static/servers.json").then(
    response => response.json()).then(
    json => { servers = json; }
  ),
]).then(() =>
  socket.emit("lobbybrowser", true) // connect to the socket
)
