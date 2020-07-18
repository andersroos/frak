

/*


 cpp-server concept



thread
  session
    blocking-receive-with-timeout

mutex    
  incoming_queue (from session, from workers)

thread 
  dispatcher
     checks_incoming_queue blocking with timeout
     session send bloking
     create threads on start
     joins threas on abort

mutex
  block queue

threads x 24
   worker
      posts for dispatcher on incoming_queue
      blocking get from block queue
      checks abort flag 
      adds start block and end block to incoming_queue
      terminates on abort flag or if queue is empty









































 */
