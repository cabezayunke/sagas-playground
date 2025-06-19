export abstract class DlqService<T = any> {
  /**
   * Sends a message to the DLQ.
   * @param message The message to dead-letter
   */
  abstract send(message: T): Promise<void>;

  /**
   * Retrieves all messages currently in the DLQ.
   */
  abstract getEvents(): Promise<T[]>;

  /**
   * Deletes a message from the DLQ by its identifier or reference.
   * @param id The identifier of the message to delete
   */
  abstract deleteEvent(id: string): Promise<void>;
}
