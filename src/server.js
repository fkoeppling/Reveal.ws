require('dotenv').config()
const express = require("express")
const http = require("http")
const socketIo = require("socket.io")
const path = require("path")

const app = express()
const server = http.createServer(app)
const io = socketIo(server)

// Pfad zu node_modules/reveal.js als statischen Pfad bereitstellen
app.use("/reveal.js", express.static(path.join(__dirname, "../node_modules/reveal.js")))

// Controller-Authentifizierung
function controllerAuth(req, res, next) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Controller"')
    return res.status(401).send('Authentication required.')
  }
  const credentials = Buffer.from(auth.split(' ')[1], 'base64').toString().split(':')
  const password = process.env.CONTROLLER_PASSWORD
  if (credentials[1] === password) {
    return next()
  }
  res.set('WWW-Authenticate', 'Basic realm="Controller"')
  return res.status(401).send('Authentication failed.')
}

// Präsentation und Controller
app.use("/controller", controllerAuth, express.static(path.join(__dirname, "controller")))
app.use("/", express.static(path.join(__dirname, "presentation")))

let currentSlide = { indexh: 0, indexv: 0 }

io.on("connection", (socket) => {
  console.log("Client connected")

  socket.on("navigate", (data) => {
    console.log("📡 Server empfängt navigate:", data)
    currentSlide = data // Store latest slide
    io.emit("navigate", data)
  })

  socket.on("getCurrentSlide", () => {
    socket.emit("navigate", currentSlide)
  })

  socket.on("getSlideState", () => {
    socket.broadcast.emit("getSlideState")
  })

  socket.on("slideState", (data) => {
    socket.broadcast.emit("slideState", data)
  })
})

const port = process.env.PORT || 3000
server.listen(port, "0.0.0.0", () => {
  console.log(`Listening on http://0.0.0.0:${port}`)
})
