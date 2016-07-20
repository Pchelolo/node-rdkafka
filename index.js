"use strict";

const ErrorCode = require('./lib/ErrorCode');
const P = require('bluebird');
const bindings = require('./build/Release/bindings');

/**
 * Message returned by the KafkaConsumer. The JS object wraps the native C++ object
 * returned by librdkafka, so every property read is actually transferred to a C++ object.
 *
 * It's mostly important when reading the payload, since the actual payload Buffer is copied
 * every time the payload is requested.
 *
 * @typedef Message
 * @public
 * @type Object
 * @property {int} err the error code if there was an error
 * @property {string} errStr the string describing the error
 * @property {string} topicName the name of the topic this message belonged to
 * @property {Number} partition the number of a partition which this message belonged to
 * @property {buffer} payload the payload of the message
 * @property {string|undefined} key the key of the message if it's defined
 * @property {Object|undefined} timestamp the message timestamp if it's available
 * @see [RdKafka::Message](http://docs.confluent.io/3.0.0/clients/librdkafka/classRdKafka_1_1Message.html)
 */

/**
 * A wrapper of librdkafka high-level [KafkaConsumer class](http://docs.confluent.io/2.0.0/clients/librdkafka/classRdKafka_1_1KafkaConsumer.html)
 * The API is almost a direct mapping for a native API, but most of the
 * functions are async and promisified.
 */
class KafkaConsumer {
    /**
     * Constructs a new instance of the consumer.
     *
     * @param {Object} conf An object containing the desired config for this consumer.
     *                      The list of supported properties can be found in
     *                      [librdkafka configuration docs](https://github.com/edenhill/librdkafka/blob/master/CONFIGURATION.md)
     */
    constructor(conf) {
        this.impl = new bindings.KafkaConsumer(conf);
    }

    /**
     * Update the subscription set to topics. Any previous subscription
     * will be unassigned and unsubscribed first.
     *
     * @see [RdKafka::KafkaConsumer::subscribe](http://docs.confluent.io/3.0.0/clients/librdkafka/classRdKafka_1_1KafkaConsumer.html#a7404297cecc9be656026c6c6154ce2bd)
     *
     * @param {string[]} topics The list of topics to subscribe too
     */
    subscribe(topics) {
        return this.impl.subscribe(topics);
    }

    /**
     * Consumes a single message from the queue.
     *
     * @see [RdKafka::KafkaConsumer::consume](http://docs.confluent.io/3.0.0/clients/librdkafka/classRdKafka_1_1KafkaConsumer.html#a7dc106f1c3b99767a0930a9cf8cabf84)
     *
     * @returns {P<Message>} a P that resolves to a next message in the queue
     */
    consume() {
        return new P((resolve, reject) => {
            this.impl.consume((error, value) => {
                if (error) {
                    return reject(error);
                }
                return resolve(value);
            });
        });
    }

    /**
     * Commits the offest for a specific topic+partition
     *
     * @param {TopicPartition[]} commitValues An array of TopicPartition objects
     *                           holding topic+partition+offset combinations
     * @see [RdKafka::KafkaConsumer::commit](http://docs.confluent.io/3.0.0/clients/librdkafka/classRdKafka_1_1KafkaConsumer.html#a66a2c7639521e0c9eb25c3417921e318)
     */
    commit(commitValues) {
        this.impl.commit(commitValues);
    }

    /**
     * Close and shut down the consumer.
     *
     * This call will block until the following operations are finished:
     *  - Trigger a local rebalance to void the current assignment
     *  - Stop consumption for current assignment
     *  - Commit offsets
     *  - Leave group
     *
     * The maximum blocking time is roughly limited to session.timeout.ms.
     *
     * Client application is responsible for calling this method on shutdown.
     *
     * NOTE: The close method is synchronous and it's blocking the EventLoop.
     *
     * @see [RdKafka::KafkaConsumer::close](http://docs.confluent.io/3.0.0/clients/librdkafka/classRdKafka_1_1KafkaConsumer.html#a5c78a721aa91f3be9903f09ddf084644)
     */
    close() {
        this.impl.close();
    }
}

/**
 * A wrapper over the librdkafka [Producer](http://docs.confluent.io/3.0.0/clients/librdkafka/classRdKafka_1_1Producer.html)
 * class.
 */
class Producer {
    /**
     * Constructs a new producer.
     *
     * @param {Object} conf An object containing the desired config for this producer.
     *                      The list of supported properties can be found in
     *                      [librdkafka configuration docs](https://github.com/edenhill/librdkafka/blob/master/CONFIGURATION.md)
     */
    constructor(conf) {
        this.impl = new bindings.Producer(conf);
    }

    /**
     * Send a message to the queue.
     *
     * @param {string} topic a name of the topic to send the message to
     * @param {string} payload the contents of the message
     * @see [RdKafka::Producer::produce](http://docs.confluent.io/3.0.0/clients/librdkafka/classRdKafka_1_1Producer.html#ab90a30c5e5fb006a3b4004dc4c9a7923)
     */
    produce(topic, payload) {
        return new P((resolve, reject) => {
            this.impl.produce(topic, payload, (error, offset) => {
                if (error) {
                    return reject(error);
                }
                return resolve(offset);
            });
        });
    }

    /**
     *  Close and shut down the producer.
     *
     *  Internally the producer runs a background thread for polling it
     *  so that message delivery reports could be received in a timely fashion.
     *  This method stops background thread and clear up the resources.
     */
    close() {
        return this.impl.close();
    }
}

module.exports.KafkaConsumer = KafkaConsumer;
module.exports.Producer = Producer;

/**
 * @classdesc A generic type to hold a single partition and various information about it.
 * The JS object internally holds a reference to the librdkafka TopicPartition object, so
 * all property access is mapped to the calls of appropriate C++ methods.
 *
 * @class
 * @description Create topic+partition object for topic and partition,
 * analog of librdkafka RdKafka::TopicPartition::create.
 * @param {string} topic The topic
 * @param {number} partition The partition
 *
 * @property {string} topic The topic, readonly
 * @property {number} partition The partition, readonly
 * @property {number} offset The offset
 * @property {ErrorCode} err The error code, readonly
 * @see [RdKafka::TopicPartition](http://docs.confluent.io/3.0.0/clients/librdkafka/classRdKafka_1_1TopicPartition.html)
 */
module.exports.TopicPartition = bindings.TopicPartition;
module.exports.ErrorCode = ErrorCode;