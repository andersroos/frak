package se.ygram.frak;

import javax.websocket.Session;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.IntBuffer;

public class Worker implements Runnable {

    public static int INFINITE = 0xfffffffb;

    private final Session session;
    private final Block block;

    Worker(Session session, Block block) {
        this.session = session;
        this.block = block;
    }

    public static byte[] BLOCK_STARTED = "block-started".getBytes();
    public static byte[] BLOCK_COMPLETED = "block-completed".getBytes();

    @Override
    public void run() {
        Thread thread = Thread.currentThread();

        byte[] buffer = new byte[64 + 4 * block.x_size * block.y_size];

        ByteBuffer bytes = ByteBuffer.wrap(buffer).order(ByteOrder.LITTLE_ENDIAN);

        bytes.put(0, BLOCK_COMPLETED, 0, Math.min(21, BLOCK_COMPLETED.length));
        bytes.putChar(21, '\0');

        byte[] id = block.id.getBytes();
        bytes.put(22, id, 0, Math.min(21, id.length));
        bytes.putChar(43, '\0');

        bytes.putInt(44, block.x_start);
        bytes.putInt(48, block.y_start);
        bytes.putInt(52, block.x_size);
        bytes.putInt(56, block.y_size);
        bytes.putInt(60, block.max_n);

        IntBuffer data = ByteBuffer.wrap(buffer, 64, buffer.length - 64).order(ByteOrder.LITTLE_ENDIAN).asIntBuffer();

        for (int yi = 0; yi < block.y_size; ++yi) {
            for (int xi = 0; xi < block.x_size; ++xi) {

                // TODO Performance test without this.
                if (thread.isInterrupted()) {
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
        try {
            session.getBasicRemote().sendBinary(bytes);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }
}

/*
op: 22 inc 0 terminated
id: 22 inc 0 terminated
x_start: 4
y_start: 4
x_size: 4
y_size: 4
max_n: 4
=> offset to data 20 * 2 + 4 * 5 = 64;


 */
