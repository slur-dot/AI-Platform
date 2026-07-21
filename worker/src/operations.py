def to_uppercase(text: str) -> str:
    """Converts text to uppercase."""
    return text.upper() if text else ""

def to_lowercase(text: str) -> str:
    """Converts text to lowercase."""
    return text.lower() if text else ""

def reverse_string(text: str) -> str:
    """Reverses the given text."""
    return text[::-1] if text else ""

def count_words(text: str) -> str:
    """Counts words in the text and returns a descriptive string."""
    if not text:
        count = 0
    else:
        count = len(text.split())
    return f"{count} words"

def execute_operation(operation_type: str, text: str) -> str:
    """
    Dispatches the text to the correct operation function based on operation_type.
    
    Args:
        operation_type: The type of operation ('uppercase', 'lowercase', 'reverse', 'word_count').
        text: The input text to process.
        
    Returns:
        The processed string.
        
    Raises:
        ValueError: If the operation_type is unknown.
    """
    dispatch = {
        'uppercase': to_uppercase,
        'lowercase': to_lowercase,
        'reverse': reverse_string,
        'word_count': count_words,
    }
    
    if operation_type not in dispatch:
        raise ValueError(f"Unknown operation type: {operation_type}")
        
    return dispatch[operation_type](text)
