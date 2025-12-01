"""
Conversation History and Context Manager for RAG-based Chatbot
"""
from typing import List, Dict, Optional, Any
from datetime import datetime
import json
from collections import deque


class ConversationMessage:
    """Represents a single message in the conversation"""
    def __init__(self, role: str, content: str, timestamp: Optional[datetime] = None, metadata: Optional[Dict] = None):
        self.role = role  # 'user' or 'assistant'
        self.content = content
        self.timestamp = timestamp or datetime.now()
        self.metadata = metadata or {}
    
    def to_dict(self):
        return {
            "role": self.role,
            "content": self.content,
            "timestamp": self.timestamp.isoformat(),
            "metadata": self.metadata
        }


class ConversationHistory:
    """Manages conversation history with sliding window for context"""
    def __init__(self, max_messages: int = 20, max_context_messages: int = 10):
        self.messages: deque = deque(maxlen=max_messages)
        self.max_context_messages = max_context_messages
        self.session_start = datetime.now()
        
    def add_message(self, role: str, content: str, metadata: Optional[Dict] = None):
        """Add a message to conversation history"""
        message = ConversationMessage(role, content, metadata=metadata)
        self.messages.append(message)
        return message
    
    def get_recent_messages(self, count: Optional[int] = None) -> List[ConversationMessage]:
        """Get recent messages for context"""
        count = count or self.max_context_messages
        return list(self.messages)[-count:]
    
    def get_all_messages(self) -> List[ConversationMessage]:
        """Get all messages in history"""
        return list(self.messages)
    
    def clear(self):
        """Clear conversation history"""
        self.messages.clear()
        self.session_start = datetime.now()
    
    def to_dict(self):
        """Export conversation history"""
        return {
            "session_start": self.session_start.isoformat(),
            "messages": [msg.to_dict() for msg in self.messages]
        }


class UserPreferenceTracker:
    """Tracks user preferences and communication style"""
    def __init__(self):
        self.preferences = {
            "detail_level": "medium",  # low, medium, high
            "technical_level": "medium",  # beginner, medium, expert
            "preferred_visualizations": [],
            "common_questions": [],
            "interaction_count": 0,
            "avg_question_length": 0,
            "topics_of_interest": []
        }
    
    def update_from_message(self, message: str):
        """Learn from user message patterns"""
        self.preferences["interaction_count"] += 1
        
        # Update average question length
        current_avg = self.preferences["avg_question_length"]
        count = self.preferences["interaction_count"]
        self.preferences["avg_question_length"] = (current_avg * (count - 1) + len(message)) / count
        
        # Detect detail level preference
        if len(message) > 200:
            self.preferences["detail_level"] = "high"
        elif len(message) < 50:
            self.preferences["detail_level"] = "low"
        
        # Detect technical level
        technical_terms = ["correlation", "regression", "variance", "standard deviation", "p-value", "distribution"]
        if any(term in message.lower() for term in technical_terms):
            self.preferences["technical_level"] = "expert"
        
        # Track common question patterns
        self.preferences["common_questions"].append(message[:100])
        if len(self.preferences["common_questions"]) > 10:
            self.preferences["common_questions"] = self.preferences["common_questions"][-10:]
    
    def get_style_hints(self) -> Dict[str, str]:
        """Get style hints for prompt engineering"""
        hints = {
            "detail": self.preferences["detail_level"],
            "technical": self.preferences["technical_level"],
            "format": "concise" if self.preferences["avg_question_length"] < 50 else "detailed"
        }
        return hints


class DatasetContext:
    """Enhanced dataset context with deep statistics"""
    def __init__(self):
        self.stats = {}
        self.schema = {}
        self.relationships = []
        self.insights = []
        self.summary = ""
        self.raw_data_sample = []
        
    def update_from_data(self, data: Any, stats: Dict):
        """Update context from data and statistics"""
        self.stats = stats
        self.summary = self._generate_comprehensive_summary(stats)
        
        # Store a sample of raw data
        if isinstance(data, list) and len(data) > 0:
            self.raw_data_sample = data[:5]  # First 5 rows
    
    def _generate_comprehensive_summary(self, stats: Dict) -> str:
        """Generate detailed summary of dataset"""
        summary_parts = []
        
        summary_parts.append(f"📊 **Dataset Structure:**")
        summary_parts.append(f"- Rows: {stats.get('rowCount', 0):,}")
        summary_parts.append(f"- Columns: {stats.get('columnCount', 0)}")
        
        if "columns" in stats:
            summary_parts.append(f"\n🔢 **Column Details:**")
            for col in stats["columns"]:
                col_type = col.get("type", "unknown")
                unique = col.get("uniqueCount", 0)
                nulls = col.get("nullCount", 0)
                summary_parts.append(
                    f"- `{col['name']}` ({col_type}): {unique:,} unique, "
                    f"{nulls} nulls ({(nulls/stats.get('rowCount', 1)*100):.1f}%)"
                )
        
        if "numericalStats" in stats:
            summary_parts.append(f"\n📈 **Numerical Columns:**")
            for col_name, num_stats in stats["numericalStats"].items():
                summary_parts.append(f"- `{col_name}`:")
                summary_parts.append(f"  - Range: {num_stats.get('min', 0):.2f} to {num_stats.get('max', 0):.2f}")
                summary_parts.append(f"  - Mean: {num_stats.get('mean', 0):.2f} (σ={num_stats.get('std', 0):.2f})")
                summary_parts.append(f"  - Median: {num_stats.get('median', 0):.2f}, IQR: {num_stats.get('iqr', 0):.2f}")
        
        if "categoricalStats" in stats:
            summary_parts.append(f"\n🏷️ **Categorical Columns:**")
            for col_name, cat_stats in stats["categoricalStats"].items():
                unique_count = cat_stats.get("uniqueCount", 0)
                summary_parts.append(f"- `{col_name}`: {unique_count} categories")
                
                if "topValues" in cat_stats and cat_stats["topValues"]:
                    top_vals = cat_stats["topValues"][:3]
                    top_str = ", ".join([f"{v['value']} ({v['count']})" for v in top_vals])
                    summary_parts.append(f"  - Top: {top_str}")
        
        return "\n".join(summary_parts)
    
    def get_context_for_prompt(self) -> str:
        """Get formatted context for AI prompt"""
        return self.summary


class RAGPromptBuilder:
    """Builds context-aware prompts with conversation history"""
    
    @staticmethod
    def build_chat_prompt(
        user_message: str,
        dataset_context: DatasetContext,
        conversation_history: ConversationHistory,
        user_preferences: UserPreferenceTracker
    ) -> str:
        """Build comprehensive RAG prompt"""
        
        style_hints = user_preferences.get_style_hints()
        recent_messages = conversation_history.get_recent_messages(5)
        
        # Build conversation context
        conversation_context = ""
        if recent_messages:
            conversation_context = "\n📝 **Recent Conversation:**\n"
            for msg in recent_messages[-3:]:  # Last 3 exchanges
                role_label = "User" if msg.role == "user" else "Assistant"
                conversation_context += f"{role_label}: {msg.content[:100]}...\n"
        
        # Determine response style
        detail_instruction = ""
        if style_hints["detail"] == "high":
            detail_instruction = "Provide detailed explanations with multiple examples."
        elif style_hints["detail"] == "low":
            detail_instruction = "Keep answers brief and to the point (2-3 sentences max)."
        else:
            detail_instruction = "Provide balanced explanations."
        
        technical_instruction = ""
        if style_hints["technical"] == "expert":
            technical_instruction = "Use technical terminology freely. The user understands statistical concepts."
        elif style_hints["technical"] == "beginner":
            technical_instruction = "Explain concepts simply, avoid jargon."
        else:
            technical_instruction = "Use moderate technical language with brief explanations."
        
        prompt = f"""You are an AI data analyst assistant having a conversation with a user about their dataset.

{dataset_context.get_context_for_prompt()}
{conversation_context}

**User's Communication Style:**
- Preferred detail level: {style_hints['detail']}
- Technical proficiency: {style_hints['technical']}

**Response Guidelines:**
{detail_instruction}
{technical_instruction}

**Current Question:**
{user_message}

**Response Requirements:**
✓ Reference specific data from the dataset statistics above
✓ Consider the conversation history for context continuity
✓ Adapt your response style to match user preferences
✓ Be conversational but precise
✓ If calculations are needed, show your work inline
✓ Focus on insights, not just raw numbers

**FORBIDDEN:**
❌ Generic answers without referencing the actual data
❌ Markdown headers (###, ##)
❌ Code examples unless explicitly requested
❌ Phrases like "Let's analyze" or "We can see"
❌ Numbered step-by-step lists unless explaining a process
❌ Tutorial-style explanations

**Your Response:**"""
        
        return prompt


# Global session storage (in production, use Redis or database)
_sessions: Dict[str, Dict] = {}


def get_session(session_id: str) -> Dict:
    """Get or create a session"""
    if session_id not in _sessions:
        _sessions[session_id] = {
            "conversation": ConversationHistory(),
            "preferences": UserPreferenceTracker(),
            "dataset_context": DatasetContext(),
            "created_at": datetime.now()
        }
    return _sessions[session_id]


def clear_session(session_id: str):
    """Clear a session"""
    if session_id in _sessions:
        del _sessions[session_id]


def cleanup_old_sessions(max_age_hours: int = 24):
    """Cleanup sessions older than max_age_hours"""
    now = datetime.now()
    to_delete = []
    for session_id, session in _sessions.items():
        age = (now - session["created_at"]).total_seconds() / 3600
        if age > max_age_hours:
            to_delete.append(session_id)
    
    for session_id in to_delete:
        del _sessions[session_id]
