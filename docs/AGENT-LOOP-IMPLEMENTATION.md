# Agent Loop Implementation

## Overview

The chatbot now implements a **true agent pattern** with conversation history, allowing it to:
1. **Remember context** from the last 10 messages
2. **Make multiple tool calls** in sequence until it has enough information
3. **Decide when to stop** and provide a final answer

## Key Features

### 1. Conversation History (Last 10 Messages)

**Implementation**:
```typescript
// Load last 10 messages from database
const { data: recentMessages } = await supabase
  .from('messages')
  .select('role, content')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(10);

// Reverse to chronological order (oldest → newest)
const conversationHistory = (recentMessages || []).reverse();
```

**Benefits**:
- **Context awareness**: LLM remembers previous questions and answers
- **Follow-up questions**: Can reference earlier parts of conversation
- **Better answers**: Uses conversation context to provide more relevant responses

**Example Conversation**:
```
User: "Show me my GA4 accounts"
AI: "You have 1 account: My Website (123456)"

User: "What properties does it have?"  ← Remembers "it" = My Website
AI: "The account 'My Website' has 2 properties..."
```

### 2. Agent Loop (Multi-Step Tool Calling)

**Implementation**:
```typescript
const MAX_ITERATIONS = 5;
let iteration = 0;

while (iteration < MAX_ITERATIONS) {
  // 1. Ask LLM what to do next
  const completion = await openai.chat.completions.create({
    messages: messages,
    functions: ga4Tools,
    function_call: 'auto'
  });

  // 2. If LLM provides final answer (no tool call), we're done!
  if (!assistantMessage.function_call) {
    finalResponse = assistantMessage.content;
    break;
  }

  // 3. LLM wants to call a tool
  const functionCall = assistantMessage.function_call;
  
  // 4. Execute the tool
  const toolResult = await mcpClient.callTool(functionName, functionArgs);
  
  // 5. Add result to conversation
  messages.push({
    role: 'function',
    name: functionName,
    content: JSON.stringify(toolResult)
  });
  
  // 6. Loop back - LLM sees result and decides next action
}
```

**How It Works**:

1. **LLM analyzes** user question and conversation history
2. **LLM decides** if it needs to call a tool or can answer directly
3. **If tool needed**: Execute tool → add result to conversation → go to step 1
4. **If ready to answer**: Provide final response → done!

### 3. Example: Multi-Step Query

**User asks**: "What are my top 3 pages this week?"

#### Iteration 1: Get Properties
```
LLM thinks: "I need to know which property to query. Let me list properties first."

Tool called: get_account_summaries
Arguments: {}
Result: {
  accounts: [{
    name: "My Website",
    properties: [{property: "properties/123456", displayName: "Production"}]
  }]
}
```

#### Iteration 2: Run Report
```
LLM thinks: "Now I know the property. Let me get the top pages data."

Tool called: run_report
Arguments: {
  property_id: "properties/123456",
  start_date: "2024-10-01",
  end_date: "2024-10-08",
  dimensions: ["pagePath"],
  metrics: ["screenPageViews"],
  limit: 3
}
Result: {
  rows: [
    {dimensionValues: ["/home"], metricValues: [5234]},
    {dimensionValues: ["/about"], metricValues: [3421]},
    {dimensionValues: ["/products"], metricValues: [2876]}
  ]
}
```

#### Iteration 3: Final Answer
```
LLM thinks: "I have all the data I need. Time to answer!"

No tool call - provides final response:
"Your top 3 pages this week are:
1. /home - 5,234 views
2. /about - 3,421 views  
3. /products - 2,876 views"
```

**Total iterations: 3**
**Tools called: 2** (get_account_summaries, run_report)

## Agent Loop Flow Diagram

```
┌─────────────────────────────────────────────────┐
│  User sends message                             │
│  + Last 10 messages loaded from DB              │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │  Start Agent Loop   │
         │  (iteration = 1)    │
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │  Send to GPT-4o     │
         │  with:              │
         │  - System prompt    │
         │  - Conv. history    │
         │  - Current message  │
         │  - Available tools  │
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │  GPT-4o decides:    │
         │  Tool call OR       │
         │  Final answer?      │
         └──────────┬──────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌───────────────┐      ┌────────────────┐
│ Tool Call     │      │ Final Answer   │
│ Needed        │      │ Ready          │
└───────┬───────┘      └────────┬───────┘
        │                       │
        ▼                       ▼
┌───────────────┐      ┌────────────────┐
│ Execute MCP   │      │ Return to      │
│ Tool          │      │ User           │
└───────┬───────┘      └────────────────┘
        │                       
        ▼                       
┌───────────────┐              
│ Add result to │              
│ conversation  │              
└───────┬───────┘              
        │                       
        ▼                       
┌───────────────┐              
│ iteration++   │              
│ < MAX?        │              
└───────┬───────┘              
        │                       
        └──────> Loop back to "Send to GPT-4o"
```

## Safety Features

### 1. Maximum Iterations
```typescript
const MAX_ITERATIONS = 5;
```

**Purpose**: Prevent infinite loops if LLM keeps calling tools

**What happens at max**:
```typescript
if (iteration >= MAX_ITERATIONS && !finalResponse) {
  messages.push({
    role: 'system',
    content: 'Please provide a final answer based on information gathered so far.'
  });
  
  // Force final response
  finalResponse = await getFinalResponse();
}
```

### 2. Error Handling
```typescript
try {
  const toolResult = await mcpClient.callTool(functionName, functionArgs);
} catch (error) {
  // Add error to conversation so LLM can try different approach
  messages.push({
    role: 'function',
    name: functionName,
    content: JSON.stringify({
      error: error.message,
      message: 'Failed to execute tool. Please try a different approach.'
    })
  });
}
```

**LLM sees the error** and can:
- Try a different tool
- Ask user for more information
- Provide answer with available data

## Log Output Examples

### Successful Multi-Tool Query

```
Chat request - User: abc123 GA4 Connected: true
Dynamically loaded GA4 tools: [
  'get_account_summaries',
  'get_property_details',
  'run_report',
  'run_realtime_report',
  'get_custom_dimensions_and_metrics',
  'list_google_ads_links'
]

=== Agent Iteration 1 ===
Tool called: get_account_summaries
Arguments: {}
Tool result received: {"accountSummaries":[{"account":"accounts/123456"...

=== Agent Iteration 2 ===
Tool called: run_report
Arguments: {"property_id":"properties/987654","start_date":"2024-10-01"...
Tool result received: {"dimensionHeaders":[{"name":"pagePath"}],"metri...

=== Agent Iteration 3 ===
Final answer received (no more tool calls)
```

### Single Tool Query

```
=== Agent Iteration 1 ===
Tool called: get_account_summaries
Arguments: {}
Tool result received: {"accountSummaries":[...

=== Agent Iteration 2 ===
Final answer received (no more tool calls)
```

### No Tool Needed

```
=== Agent Iteration 1 ===
Final answer received (no more tool calls)
```

## Performance Considerations

### Conversation History Size

**Current**: Last 10 messages

**Token count** (approximate):
- 10 messages × ~100 tokens/message = **~1,000 tokens**
- System prompt: **~200 tokens**
- User message: **~50 tokens**
- Total context: **~1,250 tokens** (before tools)

**To adjust**:
```typescript
.limit(10)  // Change this number
```

**Recommendations**:
- **10 messages**: Good balance of context and cost
- **20 messages**: Better long-term context, higher cost
- **5 messages**: Lower cost, less context

### Agent Loop Iterations

**Average iterations per query**:
- Simple questions: **1-2 iterations**
- Complex queries: **2-4 iterations**
- Max allowed: **5 iterations**

**Cost per iteration**:
Each iteration = 1 OpenAI API call

**Example costs**:
- 2 iterations = 2 API calls
- 1 iteration (no tools) = 1 API call
- 5 iterations (max) = 5 API calls

## Comparison: Before vs After

### Before (Single Tool Call)

```typescript
// Old implementation - only 1 tool call allowed
const completion = await openai.chat.completions.create({
  messages: [system, userMessage],  // No history!
  functions: tools
});

if (completion.function_call) {
  const result = await callTool(completion.function_call);
  const finalAnswer = await openai.chat.completions.create({
    messages: [system, userMessage, functionResult]
  });
}
```

**Limitations**:
- ❌ No conversation history
- ❌ Only 1 tool call allowed
- ❌ Can't chain multiple queries
- ❌ Can't follow up on previous answers

### After (Agent Loop)

```typescript
// New implementation - agent loop with history
const conversationHistory = await loadLast10Messages();

while (iteration < MAX_ITERATIONS) {
  const completion = await openai.chat.completions.create({
    messages: [system, ...history, userMessage, ...toolResults],
    functions: tools
  });
  
  if (completion.function_call) {
    const result = await callTool(completion.function_call);
    toolResults.push(result);
    continue;  // Keep going!
  } else {
    return completion.content;  // Final answer
  }
}
```

**Benefits**:
- ✅ Full conversation history
- ✅ Multiple tool calls in sequence
- ✅ Can chain queries (get accounts → get reports)
- ✅ Remembers context from previous messages

## Example Scenarios

### Scenario 1: Simple Question

**User**: "What's the weather today?"

**Agent behavior**:
```
Iteration 1:
  LLM: "This isn't about GA4. I can answer directly."
  No tool call
  Response: "I don't have access to weather data..."
```

**Total iterations**: 1
**Tools called**: 0

---

### Scenario 2: GA4 Account List

**User**: "Show me my GA4 accounts"

**Agent behavior**:
```
Iteration 1:
  LLM: "I need to call get_account_summaries"
  Tool: get_account_summaries()
  Result: {...accounts...}

Iteration 2:
  LLM: "I have the data, time to format it nicely"
  No tool call
  Response: "You have 2 accounts: ..."
```

**Total iterations**: 2
**Tools called**: 1

---

### Scenario 3: Complex Analytics Query

**User**: "Compare my traffic from last week to this week"

**Agent behavior**:
```
Iteration 1:
  LLM: "Need to get properties first"
  Tool: get_account_summaries()
  Result: {properties: [...]}

Iteration 2:
  LLM: "Got it. Now get last week's data"
  Tool: run_report({start_date: "2024-09-30", end_date: "2024-10-06"})
  Result: {rows: [...last week data...]}

Iteration 3:
  LLM: "Now get this week's data"
  Tool: run_report({start_date: "2024-10-07", end_date: "2024-10-13"})
  Result: {rows: [...this week data...]}

Iteration 4:
  LLM: "I have both datasets, time to compare"
  No tool call
  Response: "Last week: 15,234 sessions. This week: 18,421 sessions. 
             That's a 21% increase!"
```

**Total iterations**: 4
**Tools called**: 3

---

### Scenario 4: Follow-up Question

**Previous message**:
```
User: "Show me my accounts"
AI: "You have: My Website (123456)"
```

**Current message**:
```
User: "What are the properties in that account?"
```

**Agent behavior**:
```
Iteration 1:
  LLM: "From history, 'that account' = My Website (123456)"
  LLM: "I need to get property details"
  Tool: get_property_details({account_id: "accounts/123456"})
  Result: {properties: [...]}

Iteration 2:
  LLM: "Got the data"
  No tool call
  Response: "The 'My Website' account has 2 properties: ..."
```

**Total iterations**: 2
**Tools called**: 1
**Context used**: ✅ Remembered account from previous message

## Configuration Options

### Adjust Max Iterations

```typescript
// In app/api/chat/route.ts
const MAX_ITERATIONS = 5;  // Change this

// Recommendations:
// 3  = Fast, might not complete complex queries
// 5  = Good balance (default)
// 10 = Thorough, higher API costs
```

### Adjust Conversation History

```typescript
// In app/api/chat/route.ts
.limit(10)  // Change this number

// Recommendations:
// 5  = Recent context only
// 10 = Good balance (default)
// 20 = Long-term memory, higher token costs
```

### Adjust Tool Availability

```typescript
// Only provide GA4 tools for analytics queries
if (isAnalyticsQuery && ga4Tools.length > 0) {
  // Use agent loop with tools
} else {
  // Regular chat without tools
}
```

## Troubleshooting

### Issue: Agent keeps calling same tool repeatedly

**Cause**: Tool returns error or incomplete data

**Solution**: Improve error messages in tool responses
```typescript
catch (error) {
  messages.push({
    role: 'function',
    content: JSON.stringify({
      error: error.message,
      suggestion: "Try using get_account_summaries first"
    })
  });
}
```

### Issue: Agent hits max iterations frequently

**Cause**: Complex queries need more steps

**Solution**: Increase MAX_ITERATIONS or improve tool descriptions

### Issue: High API costs

**Cause**: Too many iterations or long conversation history

**Solutions**:
- Reduce MAX_ITERATIONS
- Reduce conversation history limit
- Add early stopping conditions

## Related Documentation

- [MCP Connection Management](./MCP-CONNECTION-MANAGEMENT.md)
- [OAuth Flow](./OAUTH-FLOW.md)
- [GA4 MCP Architecture](../GA4-MCP-ARCHITECTURE.md)

