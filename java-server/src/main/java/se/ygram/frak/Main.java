package se.ygram.frak;

import org.glassfish.tyrus.server.Server;

import javax.websocket.DeploymentException;
import java.util.Arrays;
import java.util.logging.Logger;

public class Main {

    private static final Logger logger = Logger.getLogger("frak");

    public static void main(String[] args) throws InterruptedException, DeploymentException {


        LogFormatter formatter = new LogFormatter();
        Arrays.stream(Logger.getLogger("").getHandlers()).forEach(h -> h.setFormatter(formatter));

        Server server = new Server("0.0.0.0", 44001, "/", null, Dispatcher.class);

        logger.info("starting java websocket server");
        server.start();

        Thread.sleep(Long.MAX_VALUE);

        server.stop();
    }
}
