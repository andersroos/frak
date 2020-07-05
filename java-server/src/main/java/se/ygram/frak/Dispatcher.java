package se.ygram.frak;

import java.io.Reader;
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

    @OnOpen
    public void onOpen(Session session) {
        logger.info("open " + session.getUserProperties().toString());
    }

    @OnMessage
    public String onMessage(Reader reader, Session session) {
        JsonObject object = Json.createReader(reader).readObject();
        return switch (object.getString("op")) {
            case "start" -> this.start(object);
            case "interrupt" -> this.interrupt(object);
            default -> "{\"status\": \"error\", \"message\": \"bad op\"}";
        };
    }

    private String interrupt(JsonObject object) {
        return null;
    }

    private String start(JsonObject object) {
        return null;
    }

    @OnClose
    public void onClose(Session session, CloseReason closeReason) {
        logger.info("close " + session.getUserProperties().toString());
    }

}
