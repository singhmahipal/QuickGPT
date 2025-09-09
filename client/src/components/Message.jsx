import React, { useEffect, useState } from 'react';
import { assets } from '../assets/assets';
import moment from 'moment';
import Markdown from 'react-markdown';
import Prism from 'prismjs';
import 'prismjs/themes/prism.css'; 

const useForceUpdate = (interval = 30000) => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, interval);
    return () => clearInterval(timer);
  }, [interval]);
  return tick;
};


const parseTimestamp = (timeStamp) => {
  if (!timeStamp) return new Date();

  if (typeof timeStamp === 'number' || /^\d+$/.test(timeStamp)) {
    let tsNum = Number(timeStamp);
    if (tsNum < 1e12) tsNum *= 1000;
    return new Date(tsNum);
  }

  const date = new Date(timeStamp);
  if (isNaN(date.getTime())) {
    return new Date();
  }
  return date;
};

const Message = ({ message }) => {
  const tick = useForceUpdate();

  const time = parseTimestamp(message.timeStamp || message.timestamp);

  const momentTime = moment(time);

  useEffect(() => {
    Prism.highlightAll();
  }, [message.content, tick]);

  return (
    <div>
      {message.role === 'user' ? (
        <div className="flex items-start justify-end my-4 gap-2">
          <div className="flex flex-col gap-2 p-2 px-4 bg-slate-50 dark:bg-[#57317c]/30 border border-[#80609f]/30 rounded-md max-w-2xl">
            <p className="text-sm dark:text-primary">{message.content}</p>
            <span className="text-xs text-gray-400 dark:text-[#b1a6c0]">
              {momentTime.fromNow()}
            </span>
          </div>
          <img src={assets.user_icon} alt="user icon" className="w-8 rounded-full" />
        </div>
      ) : (
        <div className="inline-flex flex-col gap-2 p-2 px-4 max-w-2xl bg-primary/20 dark:bg-[#57317c]/30 border border-[#80609f]/30 rounded-md my-4">
          {message.isImage ? (
            <img src={message.content} alt="msg content" className="w-full max-w-md mt-2 rounded-md" />
          ) : (
            <div className="text-sm dark:text-primary reset-tw">
              <Markdown>{message.content}</Markdown>
            </div>
          )}
          <span className="text-xs text-gray-400 dark:text-[#b1a6c0]">
            {momentTime.fromNow()}
          </span>
        </div>
      )}
    </div>
  );
};

export default Message;
