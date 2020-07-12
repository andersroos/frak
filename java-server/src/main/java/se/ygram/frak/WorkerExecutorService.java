package se.ygram.frak;

import javax.websocket.Session;
import java.io.IOException;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.logging.Level;
import java.util.logging.Logger;

import static java.lang.String.format;

public class WorkerExecutorService extends ThreadPoolExecutor {

    private static final Logger logger = Logger.getLogger(ThreadPoolExecutor.class.getName());

    private final Session session;
    private final CompletionListener completionListener;
    private AtomicInteger blocks;

    public interface CompletionListener {
        void onComplete() throws IOException;
    }

    public WorkerExecutorService(Session session, int workers, int blocks, CompletionListener completionListener) {
        super(workers, workers, 1, TimeUnit.DAYS, new LinkedBlockingQueue<>());
        this.session = session;
        this.completionListener = completionListener;
        this.blocks = new AtomicInteger(blocks);
        prestartAllCoreThreads();
    }

    public void calculateBlock(Block block) {
        execute(new Worker(session, block));
    }

    @Override
    protected void afterExecute(Runnable r, Throwable t) {
        super.afterExecute(r, t);
        try {
            if (t == null && ((Worker) r).isCompleted()) {
                if (blocks.addAndGet(-1) == 0) {
                    completionListener.onComplete();
                    shutdown();
                }
            }
        }
        catch (IOException e) {
            logger.log(Level.WARNING, format("failed to send to client %s", session.getId()), e);
        }
    }
}
