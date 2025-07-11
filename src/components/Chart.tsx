import React from 'react';

interface ChartProps {
  data: Array<{
    label: string;
    value: number;
    color?: string;
    max?: number;
  }>;
  type: 'bar' | 'line';
  title: string;
  className?: string;
  maxValue?: number;
}

const Chart: React.FC<ChartProps> = ({ data, type, title, className = '', maxValue }) => {
  if (type === 'bar') {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
        <div className="space-y-4">
          {data.map((item, index) => {
            // Use individual max value for each item, fallback to global maxValue, then to computed max
            const itemMax = item.max || maxValue || Math.max(...data.map(d => d.value));
            const percentage = itemMax > 0 ? (item.value / itemMax) * 100 : 0;
            
            return (
              <div key={index}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {item.value}{item.max ? `/${item.max}` : ''}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${item.color || 'bg-blue-600'}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      <div className="h-64 flex items-end space-x-2">
        {data.map((item, index) => {
          // Use individual max value for each item, fallback to global maxValue, then to computed max
          const itemMax = item.max || maxValue || Math.max(...data.map(d => d.value));
          const height = itemMax > 0 ? (item.value / itemMax) * 200 : 0;
          
          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div
                className={`w-full ${item.color || 'bg-blue-600'} rounded-t`}
                style={{ height: `${height}px` }}
              />
              <span className="text-xs text-gray-600 dark:text-gray-400 mt-2 text-center">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Chart;