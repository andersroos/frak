package se.ygram.frak;

import java.io.IOException;
import java.io.Reader;
import java.util.concurrent.*;
import java.util.logging.Logger;

import javax.json.Json;
import javax.json.JsonObject;
import javax.websocket.CloseReason;
import javax.websocket.OnClose;
import javax.websocket.OnMessage;
import javax.websocket.OnOpen;
import javax.websocket.Session;
import javax.websocket.server.ServerEndpoint;

import static java.lang.String.format;


@ServerEndpoint("/")
public class Dispatcher {

    private static final Logger logger = Logger.getLogger(Dispatcher.class.getName());
    private static final Object[] currentSessionLock = new Object[0];
    private static Session currentSession = null;
    private static WorkerExecutorService currentSessionThreads;

    @OnOpen
    public void onOpen(Session session) throws IOException {
        synchronized (currentSessionLock) {
            // This implementation only supports one session, so in case a second connects, abort all calculations
            // and close existing sessions.
            if (currentSession != null) {
                currentSession.close();
            }
            currentSession = session;
        }
        logger.info("open " + session.getId());
        session.getBasicRemote().sendText(
            Json.createObjectBuilder()
                .add("op", Op.CONFIG)
                .add("endian", "little")
                .add("max_workers", Runtime.getRuntime().availableProcessors())
                .build()
                .toString()
        );
    }

    @OnMessage
    public String onMessage(Reader reader, Session session) {
        JsonObject object = Json.createReader(reader).readObject();
        String op = object.getString("op");
        return switch (op) {
            case "start" -> this.start(session, object);
            case "abort" -> this.abort(session, object);
            default -> Json.createObjectBuilder()
                .add("status", "error")
                .add("message", format("bad op %s", op))
                .build().toString();
        };
    }

    private String abort(Session session, JsonObject object) {
        String id = object.getString("id");
        logger.info(format("aborting %s %s", session.getId(), id));
        currentSessionThreads.shutdownNow();
        try {
            if (!currentSessionThreads.awaitTermination(2, TimeUnit.MINUTES)) {
                logger.warning(format("await termination timeout when aborting for session %s", session.getId()));
            }
        } catch (InterruptedException e) {
            logger.warning(format("await termination interrupted when aborting for session %s", session.getId()));
        }
        logger.info(format("aborted %s %s", session.getId(), id));
        return Json.createObjectBuilder()
            .add("op", Op.ABORTED)
            .add("id", id)
            .build().toString();
    }

    private String start(Session session, JsonObject object) {
        String id = object.getString("id");
        int x_size = object.getInt("x_size");
        int y_size = object.getInt("y_size");
        int block_x_size = object.getInt("block_x_size");
        int block_y_size = object.getInt("block_y_size");
        int max_n = object.getInt("max_n");
        long x0_start_index = object.getJsonNumber("x0_start_index").longValue();
        long y0_start_index = object.getJsonNumber("y0_start_index").longValue();
        double x0_delta = object.getJsonNumber("x0_delta").doubleValue();
        double y0_delta = object.getJsonNumber("y0_delta").doubleValue();
        int workers = object.getInt("workers");

        logger.info(format("starting %s %s %s %d %s %d", session.getId(), id, workers, x0_start_index, Double.valueOf(x0_delta).toString(), max_n));

        synchronized (currentSessionLock) {
            currentSessionThreads = new WorkerExecutorService(
                session,
                workers,
                x_size / block_x_size * y_size / block_y_size,
                () -> {
                    session.getBasicRemote().sendText(Json.createObjectBuilder()
                        .add("op", Op.COMPLETED)
                        .add("id", id)
                        .build().toString()
                    );
                    logger.info(format("completed %s %s", session.getId(), id));
                }
            );
        }

        for (int y = 0; y < y_size; y += block_y_size) {
            for (int x = 0; x < x_size; x += block_x_size) {
                currentSessionThreads.calculateBlock(new Block(id, x, y, block_x_size, block_y_size, x0_start_index + x, x0_delta, y0_start_index + y, y0_delta, max_n));
            }
        }

        return null;
    }

    @OnClose
    public void onClose(Session session, CloseReason closeReason) {
        synchronized (currentSessionLock) {
            if (currentSession != null && session.getId().equals(currentSession.getId())) {
                currentSession = null;
            }
            if (currentSessionThreads != null && currentSessionThreads.isTerminated()) {
                currentSessionThreads.shutdownNow();
                currentSessionThreads = null;
            }
        }
        logger.info("close " + session.getId());
    }

}
