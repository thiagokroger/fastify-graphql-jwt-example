const fastify = require("fastify")();

const users = [
  { id: 1, name: "matteo", email: "matteo@email.com", password: "12345" },
  { id: 2, name: "thiago", email: "thiago@email.com", password: "123456" }
];

const getToken = (email, password) => {
  const user = users.find(u => u.email === email && u.password === password);
  return user ? fastify.jwt.sign({ id: user.id }) : null;
};

const getUserName = id => {
  const user = users.find(u => u.id === id);
  return user ? user.name : null;
};

const verifyJWT = async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.send(err);
  }
};

const registerRoutes = () => {
  fastify
    .post("/login", async (request, reply) => {
      const { email, password } = request.body;
      try {
        return reply.graphql(
          `{ token(email: "${email}", password: "${password}") }`
        );
      } catch (error) {
        return reply.error(error);
      }
    })
    .route({
      method: "GET",
      url: "/user-name",
      preHandler: fastify.auth([fastify.verifyJWT]),
      handler: (request, reply) => {
        const userId = request.user.id;
        try {
          return reply.graphql(`{ userName(id: ${userId}) }`);
        } catch (error) {
          return reply.send;
        }
      }
    });
};

fastify
  .register(require("fastify-auth"))
  .register(require("fastify-jwt"), { secret: "supersecret" })
  .register(require("fastify-gql"), {
    schema: `
      type Query {
        token(email: String, password: String): String,
        userName(id: Int): String
      }
    `,
    resolvers: {
      Query: {
        token: async (_, { email, password }) => getToken(email, password),
        userName: async (_, { id }) => {
          return getUserName(id);
        }
      }
    }
  })
  .decorate("verifyJWT", verifyJWT)
  .after(registerRoutes)
  .listen(9000, (err, address) => {
    if (err) {
      console.log(err);
      process.exit(1);
    }
    console.log("Server running at: " + address);
  });
