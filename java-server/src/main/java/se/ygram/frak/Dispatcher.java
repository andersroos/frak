package se.ygram.frak;

import java.io.IOException;
import java.io.Reader;
import java.util.logging.Level;
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
                .add("op", "config")
                .add("max_workers", Runtime.getRuntime().availableProcessors())
                .build()
                .toString()
        );
    }

    @OnMessage
    public String onMessage(Reader reader, Session session) {
        JsonObject object = Json.createReader(reader).readObject();
        return switch (object.getString("op")) {
            case "start" -> this.start(object);
            case "abort" -> this.abort(object);
            default -> Json.createObjectBuilder().add("status", "error").add("message", "bad op").build().toString();
        };
    }

    private String abort(JsonObject object) {
        return null;
    }

    private String start(JsonObject object) {
        String id = object.getString("id");
        int x_size = object.getInt("x_size");
        int y_size = object.getInt("y_size");
        int max_n = object.getInt("max_n");
        double x0_start_index = object.getJsonNumber("x0_start_index").doubleValue();
        double y0_start_index = object.getJsonNumber("y0_start_index").doubleValue();
        double x0_delta = object.getJsonNumber("x0_delta").doubleValue();
        double y0_delta = object.getJsonNumber("y0_delta").doubleValue();
        int workers = object.getInt("workers");

        logger.info(String.format("starting %s", id));

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
