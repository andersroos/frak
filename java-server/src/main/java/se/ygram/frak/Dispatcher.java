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


@ServerEndpoint("/")
public class Dispatcher {

    private static final Logger logger = Logger.getLogger(Dispatcher.class.getName());
    private static final Object[] currentSessionLock = new Object[0];
    private static Session currentSession = null;
    private static final ThreadPoolExecutor threads;
    static {
        int cores = Runtime.getRuntime().availableProcessors();
        threads = new ThreadPoolExecutor(
            cores,
            cores,
            1, TimeUnit.MILLISECONDS,
            new LinkedBlockingQueue<>()
        );
        threads.prestartAllCoreThreads();
    }

    @OnOpen
    public void onOpen(Session session) throws IOException {
        synchronized (currentSessionLock) {
            // This implementation only supports one session, so in case a second connects, abort all calculations
            // and close existing sessions.
            if (currentSession != null) {
                currentSession.close();
                // TODO Abort all calculations.
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
        return switch (object.getString("op")) {
            case "start" -> this.start(session, object);
            case "abort" -> this.abort(session, object);
            default -> Json.createObjectBuilder().add("status", "error").add("message", "bad op").build().toString();
        };
    }

    private String abort(Session session, JsonObject object) {
        return null;
    }

    private String start(Session session, JsonObject object) {
        String id = object.getString("id");
        int x_size = object.getInt("x_size");
        int y_size = object.getInt("y_size");
        int block_x_size = object.getInt("block_x_size");
        int block_y_size = object.getInt("block_y_size");
        int max_n = object.getInt("max_n");
        int x0_start_index = object.getInt("x0_start_index");
        int y0_start_index = object.getInt("y0_start_index");
        double x0_delta = object.getJsonNumber("x0_delta").doubleValue();
        double y0_delta = object.getJsonNumber("y0_delta").doubleValue();
        int workers = object.getInt("workers");

        logger.info(String.format("starting %s %s", id, workers));

        synchronized (currentSessionLock) {
            threads.setCorePoolSize(workers);
            threads.setMaximumPoolSize(workers);
        }

        for (int y = 0; y < y_size; y += block_y_size) {
            for (int x = 0; x < x_size; x += block_x_size) {
                threads.execute(new Worker(
                    session,
                    new Block(id, x, y, block_x_size, block_y_size, x0_start_index + x, x0_delta, y0_start_index + y, y0_delta, max_n)
                ));
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
        }
        logger.info("close " + session.getId());
    }

}
