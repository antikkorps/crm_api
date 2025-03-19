import Koa from "koa"

const app = new Koa()

app.use(async (ctx) => {
  ctx.body = "Hello, Koa with TypeScript!"
})

app.listen(3030, () => {
  console.log("Server is running on port 3000")
})
