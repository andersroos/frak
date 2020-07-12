package se.ygram.frak;

import javax.json.Json;
import javax.websocket.Session;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.IntBuffer;
import java.util.logging.Logger;

import static java.lang.String.format;


public class Worker implements Runnable {

    private static final Logger logger = Logger.getLogger(Worker.class.getName());

    public static int INFINITE = 0xfffffffb;

    private final Session session;
    private final Block block;

    Worker(Session session, Block block) {
        this.session = session;
        this.block = block;
    }

    @Override
    public void run() {
        try {

            Thread thread = Thread.currentThread();

            session.getBasicRemote().sendText(Json.createObjectBuilder()
                .add("op", Op.BLOCK_STARTED)
                .add("id", block.id)
                .add("x_start", block.x_start)
                .add("y_start", block.y_start)
                .add("x_size", block.x_size)
                .add("y_size", block.y_size)
                .build().toString()
            );

            byte[] buffer = new byte[48 + 4 * block.x_size * block.y_size];

            ByteBuffer bytes = ByteBuffer.wrap(buffer).order(ByteOrder.LITTLE_ENDIAN);
            bytes.put(0, block.id.getBytes(), 0, 16);
            bytes.putInt(16, block.x_start);
            bytes.putInt(20, block.y_start);
            bytes.putInt(24, block.x_size);
            bytes.putInt(28, block.y_size);

            IntBuffer data = ByteBuffer.wrap(buffer, 32, buffer.length - 32).order(ByteOrder.LITTLE_ENDIAN).asIntBuffer();

            for (int yi = 0; yi < block.y_size; ++yi) {
                for (int xi = 0; xi < block.x_size; ++xi) {

                    // TODO Performance test without this.
                    if (thread.isInterrupted()) {
                        logger.info(format("worker intetrrupted %s %s", session.getId(), block.id));
                        return;
                    }

                    double y0 = block.y0_delta * (block.y0_start_index + yi);
                    double x0 = block.x0_delta * (block.x0_start_index + xi);
                    int n = 0;
                    double xn = x0;
                    double yn = y0;
                    for (; n < block.max_n; ++n) {
                        double xn2 = xn * xn;
                        double yn2 = yn * yn;
                        if ((xn2 + yn2) >= 4) {
                            break;
                        }
                        double next_xn = xn2 - yn2 + x0;
                        double next_yn = 2 * xn * yn + y0;
                        xn = next_xn;
                        yn = next_yn;
                    }
                    data.put(yi * block.x_size + xi, n >= block.max_n ? INFINITE : n);
                }
            }
            session.getBasicRemote().sendBinary(bytes);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }
}

/*
id: 16
x_start: 4
y_start: 4
x_size: 4
y_size: 4
=> offset to data 32;
 */
