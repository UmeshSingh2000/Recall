export function getHealth(req, res) {
  return res.json({
    message: "All System up and running!",
    status: 200
  })
}
