import { randomUUID } from "node:crypto";

import { fastify } from "fastify";
import { fastifyCors } from "@fastify/cors";

import { z } from "zod";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";

import { db } from "../db/client.ts";
import { schema } from "../db/schema/index.ts";
import { dispatchOrderCreated } from "../broker/messages/order-created.ts";
import type { OrderCreatedMessage } from "../../../contracts/messages/order-created-message.ts";

const app = fastify().withTypeProvider<ZodTypeProvider>();

app.setSerializerCompiler(serializerCompiler);
app.setValidatorCompiler(validatorCompiler);

app.register(fastifyCors, { origin: "*" });

app.get("/health", () => {
  return "OK";
});

app.post(
  "/orders",
  {
    schema: {
      body: z.object({
        amount: z.coerce.number(),
      }),
    },
  },
  async (request, reply) => {
    const { amount } = request.body;

    console.log("Creating an order with amount", amount);

    const orderId = randomUUID();
    const customerId = "093e12d3-2e9f-441e-9dbf-8c4f1b23b2a5";

    const data: OrderCreatedMessage = {
      orderId,
      amount,
      customer: {
        id: customerId,
      },
    };

    dispatchOrderCreated(data);

    await db.insert(schema.orders).values({
      id: orderId,
      customerId,
      amount,
    });

    return reply.status(201).send();
  }
);

app.listen({ host: "0.0.0.0", port: 3333 }).then(() => {
  console.log("[Orders] HTTP Server running 🔥");
});
