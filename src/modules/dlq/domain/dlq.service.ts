export interface DlqService<T = any> {
  /**
   * Sends a message to the DLQ.
   * @param message The message to dead-letter
   */
  send(message: T): Promise<void>;

  /**
   * Retrieves all messages currently in the DLQ.
   */
  getEvents(): Promise<T[]>;

  /**
   * Deletes a message from the DLQ by its identifier or reference.
   * @param id The identifier of the message to delete
   */
  deleteEvent(id: string): Promise<void>;
}
